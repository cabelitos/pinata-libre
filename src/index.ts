import process from 'process';
import { createConnection, getConnection } from 'typeorm';
import express from 'express';
import { createEventAdapter } from '@slack/events-api';
import { WebClient } from '@slack/web-api';
import type { AuthorizeResult } from '@slack/oauth';

import Leaderboard, { InsertLeaderboardData } from './entities/Leaderboard';
import AllowedEmoji from './entities/AllowedEmoji';

import installerProvider from './install-provider';

interface Command {
  handler: (
    channel: string,
    threadId: string | undefined,
    team: string,
    user: string,
    args: string,
  ) => Promise<void>;
  regex: string;
}

interface SlackMessage {
  client_msg_id: string;
  team: string;
  text: string;
  user: string;
}

const getLeaderboardLimit = (): number => {
  const limit = parseInt(process.env.LEADERBOARD_LIMIT ?? '10', 10) ?? 10;
  return Number.isNaN(limit) ? 10 : limit;
};

const emojiRegExp = /(:[\w-]+:)/gi;
const peopleRegex = /<@(.+?)>/g;

const startRtmService = async (): Promise<void> => {
  await createConnection();

  const app = express();
  const slackEvents = createEventAdapter(process.env.SLACK_SIGN_SECRET ?? '');
  const slackEventListener = slackEvents.requestListener();

  const databaseCheck = async (): Promise<void> => {
    const conn = getConnection();
    if (!conn.isConnected) {
      throw new Error('Not connected with the database');
    }
    await conn.query('select 1');
  };

  app.get('/.well-known/server-health', async (_, reply) => {
    try {
      await databaseCheck();
    } catch (err) {
      reply.status(500).send({ error: err.message, status: 'fail' });
      return;
    }
    reply.status(200).send({ status: 'ok' });
  });

  app.post('/slack/events', slackEventListener);

  app.get('/', async (_, res) => {
    try {
      const url = await installerProvider.generateInstallUrl({
        scopes: ['app_mentions:read', 'channels:history', 'chat:write'],
      });
      res.send(
        `<a href=${url}><img alt=""Add to Slack"" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>`,
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log(error);
    }
  });

  app.get('/slack/oauth_redirect', async (req, res) => {
    await installerProvider.handleCallback(req, res);
  });

  const leaderboardLimit = getLeaderboardLimit();

  const getSlackBotInfo = async (teamId: string): Promise<AuthorizeResult> => {
    return installerProvider.authorize({
      enterpriseId: '',
      isEnterpriseInstall: false,
      teamId,
    });
  };

  const sendMessage = async (
    text: string,
    channel: string,
    threadId: string | undefined,
    teamId: string,
    isEphemeral = false,
    user = '',
  ): Promise<void> => {
    const { botToken } = await getSlackBotInfo(teamId);
    const web = new WebClient(botToken);
    if (isEphemeral) {
      await web.chat.postEphemeral({
        blocks: [
          {
            text: {
              text,
              type: 'mrkdwn',
            },
            type: 'section',
          },
        ],
        channel,
        text: '',
        user,
      });
      return;
    }
    await web.chat.postMessage({
      channel,
      text,
      thread_ts: threadId,
    });
  };

  const commands: Command[] = [
    {
      handler: async (
        channel: string,
        threadId: string | undefined,
        team: string,
      ): Promise<void> => {
        const data = await Leaderboard.getLeaderboard(leaderboardLimit, team);
        if (!data.length) {
          await sendMessage(
            'Leaderboard is empty. Starting sending recognitions! :taco: :burrito:',
            channel,
            threadId,
            team,
          );
          return;
        }
        let text = '';
        data.forEach(({ awardCount, userId }, i): void => {
          text += `>${i + 1}) <@${userId}> - ${awardCount} ${
            awardCount.toString() === '1' ? 'recognition' : 'recognitions'
          }\n`;
        });
        await sendMessage(text, channel, threadId, team);
      },
      regex: 'leaderboard\\s*',
    },
    {
      handler: async (
        channel: string,
        threadId: string | undefined,
        teamId: string,
        user: string,
        args: string,
      ): Promise<void> => {
        const emojisMatch = args.match(emojiRegExp);
        if (!emojisMatch) {
          return;
        }
        try {
          await AllowedEmoji.makeAllowedEmojis(emojisMatch, teamId);
        } catch {
          try {
            await sendMessage(
              `Something wrong has ocurred and I could not add the emojis ${args} to the app. Sorry :expressionless:`,
              channel,
              threadId,
              teamId,
              true,
              user,
            );
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error(err);
          }
        }
      },
      regex: 'add-emoji\\s+(.+)*',
    },
  ];

  const prepareMessageContext = (
    subtype: string | undefined,
    originalText: string | undefined,
    originalMessageId: string | undefined,
    message: SlackMessage,
    prevMessage: SlackMessage,
    teamId: string | undefined,
    user: string | undefined,
  ): Record<
    | 'textToUse'
    | 'messageIdToDelete'
    | 'messageIdToUse'
    | 'teamIdToUse'
    | 'userIdToUse',
    string
  > => {
    let textToUse = originalText;
    let messageIdToUse = originalMessageId;
    let messageIdToDelete;
    let teamIdToUse = teamId;
    let userIdToUse = user;
    if (subtype === 'message_changed') {
      textToUse = message.text;
      messageIdToUse = message.client_msg_id;
      messageIdToDelete = prevMessage.client_msg_id;
      teamIdToUse = prevMessage.team;
      userIdToUse = message.user;
    } else if (subtype === 'message_deleted') {
      textToUse = prevMessage.text;
      messageIdToDelete = prevMessage.client_msg_id;
      teamIdToUse = prevMessage.team;
      userIdToUse = prevMessage.user;
    }
    return {
      messageIdToDelete: messageIdToDelete ?? '',
      messageIdToUse: messageIdToUse ?? '',
      teamIdToUse: teamIdToUse ?? '',
      textToUse: textToUse ?? '',
      userIdToUse: userIdToUse ?? '',
    };
  };

  const getMentionedPeople = (text: string): RegExpMatchArray[] =>
    Array.from(text.matchAll(peopleRegex) ?? []);

  slackEvents.on(
    'app_mention',
    async ({
      channel,
      team,
      text,
      thread_ts: threadId,
      user,
    }): Promise<void> => {
      try {
        const people = getMentionedPeople(text);
        if (people.length !== 1) return;
        const botId = people[0][1];
        for (let i = 0; i < commands.length; i += 1) {
          const { handler, regex } = commands[i];
          const cmdMatch = text.match(
            new RegExp(`^\\s*<@${botId}>\\s+${regex}$`, 'i'),
          );
          if (cmdMatch) {
            // eslint-disable-next-line no-await-in-loop
            await handler(channel, threadId, team, user, cmdMatch[1]);
            return;
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    },
  );

  slackEvents.on(
    'message',
    async ({
      text,
      subtype,
      client_msg_id: messageId,
      previous_message: prevMessage,
      message,
      team: teamId,
      channel,
      user,
    }): Promise<void> => {
      try {
        const {
          messageIdToDelete,
          messageIdToUse,
          teamIdToUse,
          textToUse,
          userIdToUse,
        } = prepareMessageContext(
          subtype,
          text,
          messageId,
          message,
          prevMessage,
          teamId,
          user,
        );
        const emojisMatch = textToUse.match(emojiRegExp);
        const people = getMentionedPeople(textToUse);
        if (!people) return;
        if (subtype === 'message_deleted' && messageIdToDelete && emojisMatch) {
          await Leaderboard.deleteAwards(messageIdToDelete, teamIdToUse);
          return;
        }

        if (!emojisMatch) return;

        const allowedEmojis = await AllowedEmoji.getAllowedEmojisByTeam(teamId);

        const { emojisNotAllowed, emojisToAdd } = emojisMatch.reduce<{
          emojisNotAllowed: string[];
          emojisToAdd: string[];
        }>(
          (acc, emoji) => {
            if (allowedEmojis.has(emoji)) {
              acc.emojisToAdd.push(emoji);
            } else {
              acc.emojisNotAllowed.push(emoji);
            }
            return acc;
          },
          { emojisNotAllowed: [], emojisToAdd: [] },
        );

        const { botUserId } = await getSlackBotInfo(teamIdToUse);
        const emojiToSave = people.reduce(
          (
            acc: Record<string, InsertLeaderboardData[]>,
            match: RegExpMatchArray,
          ): Record<string, InsertLeaderboardData[]> => {
            const userId = match[1];
            if (!acc[userId] && botUserId !== userId) {
              acc[userId] = emojisToAdd.map(emojiId => ({
                emojiId,
                messageId: messageIdToUse,
                teamId: teamIdToUse,
                userId,
              }));
            }
            return acc;
          },
          {},
        );
        await Leaderboard.addAwards(
          Object.values(emojiToSave).flat(),
          messageIdToDelete,
          teamIdToUse,
        );
        if (emojisNotAllowed.length) {
          const emojis = emojisNotAllowed.join(' ');
          await sendMessage(
            `Hey, these emojis ${emojis} will not count as reward. Please add it by using the following command: \`@[bot-name] add-emoji ${emojis}\``,
            channel,
            '',
            teamIdToUse,
            true,
            userIdToUse,
          );
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    },
  );

  await new Promise<void>((resolve, reject) => {
    try {
      app.listen(
        parseInt(process.env.SERVER_PORT ?? '3000', 10) ?? 3000,
        process.env.SERVER_HOST ?? 'localhost',
        resolve,
      );
    } catch (err) {
      reject(err);
    }
  });
};

Promise.all([startRtmService()]).catch((err): void => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
