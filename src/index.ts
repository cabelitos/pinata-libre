import process from 'process';
import { createConnection, getConnection } from 'typeorm';
import { RTMClient, RTMCallResult } from '@slack/rtm-api';
import fastify from 'fastify';

import Leaderboard, { InsertLeaderboardData } from './entities/Leaderboard';

interface Command {
  handler: (channel: string, threadId: string | undefined) => Promise<void>;
  keyword: string;
}

const getLeaderboardLimit = (): number => {
  const limit = parseInt(process.env.LEADERBOARD_LIMIT ?? '10', 10) ?? 10;
  return Number.isNaN(limit) ? 10 : limit;
};

const rtm = new RTMClient(process.env.SLACK_BOT_TOKEN ?? '', {
  autoReconnect: true,
});

const tacoRegExp = /:taco:/gi;
const peopleRegex = /<@(.+?)>/g;

const startRtmService = async (): Promise<void> => {
  await createConnection();
  let botId = '';
  const leaderboardLimit = getLeaderboardLimit();
  const sendMessage = (
    text: string,
    channel: string,
    threadId: string | undefined,
  ): Promise<RTMCallResult> => {
    return rtm.addOutgoingEvent(true, 'message', {
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
      ): Promise<void> => {
        const data = await Leaderboard.getLeaderboard(leaderboardLimit);
        if (!data.length) {
          await sendMessage(
            'Leaderboard is empty. Starting sending tacos! :taco:',
            channel,
            threadId,
          );
          return;
        }
        let text = '';
        data.forEach(({ tacoCount, userId }, i): void => {
          text += `${i + 1}) <@${userId}> - ${tacoCount} ${
            tacoCount === '1' ? 'taco' : 'tacos'
          }\n`;
        });
        await sendMessage(text, channel, threadId);
      },
      keyword: 'leaderboard',
    },
  ];

  rtm.on(
    'message',
    async ({
      text,
      subtype,
      client_msg_id: messageId,
      previous_message: prevMessage,
      message,
      channel,
      thread_ts: threadId,
    }): Promise<void> => {
      try {
        let messageIdToUse: string = messageId ?? '';
        let textToUse: string = text ?? '';
        let tacosToDelete = null;
        if (subtype === 'message_deleted') {
          await Leaderboard.deleteTacos(prevMessage.client_msg_id);
          return;
        }

        // New message or edited message
        if (subtype === 'message_changed') {
          textToUse = message.text;
          messageIdToUse = message.client_msg_id;
          // Message is being updated, delete old tacos.
          tacosToDelete = prevMessage.client_msg_id;
        }

        const people = Array.from(textToUse.matchAll(peopleRegex) ?? []);
        if (!people) return;

        if (people.length === 1 && people[0][1] === botId) {
          for (let i = 0; i < commands.length; i += 1) {
            const { handler, keyword } = commands[i];
            if (
              textToUse.match(
                new RegExp(`^\\s*<@${botId}>\\s+${keyword}\\s*$`, 'i'),
              )
            ) {
              // eslint-disable-next-line no-await-in-loop
              await handler(channel, threadId);
              return;
            }
          }
        }

        const tacoMatch = textToUse.match(tacoRegExp);
        if (!tacoMatch) return;
        const tacosToSave = people.reduce(
          (
            acc: Record<string, InsertLeaderboardData[]>,
            match: RegExpMatchArray,
          ): Record<string, InsertLeaderboardData[]> => {
            const userId = match[1];
            if (!acc[userId] && userId !== botId) {
              acc[userId] = new Array(tacoMatch.length).fill({
                messageId: messageIdToUse,
                userId,
              });
            }
            return acc;
          },
          {},
        );
        await Leaderboard.addTacos(
          Object.values(tacosToSave).flat(),
          tacosToDelete,
        );
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
      }
    },
  );
  const { self } = await rtm.start();
  if (self && typeof self === 'object' && 'id' in self) {
    // slack does not properly define the start() return type.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    botId = self.id;
  } else {
    throw new Error(
      `Could not obtain the botId received ${JSON.stringify(self)}`,
    );
  }
};

const startHealthCheck = async (): Promise<void> => {
  const health = fastify();
  const slackApiCheck = (): Promise<void> =>
    rtm.connected
      ? Promise.resolve()
      : Promise.reject(new Error('Not connected with the slack API'));
  const databaseCheck = async (): Promise<void> => {
    const conn = getConnection();
    if (!conn.isConnected) {
      throw new Error('Not connected with the database');
    }
    await conn.query('select 1');
  };
  health.get('/.well-known/fastify/server-health', async (_, reply) => {
    try {
      await Promise.all([slackApiCheck(), databaseCheck()]);
    } catch (err) {
      reply.code(500).send({ error: err.message, status: 'fail' });
      return;
    }
    reply.code(200).send({ status: 'ok' });
  });
  await health.listen(
    process.env.HEALCHECKER_PORT ?? 8080,
    process.env.HEALCHECKER_HOST ?? 'localhost',
  );
};

Promise.all([startRtmService(), startHealthCheck()]).catch((err): void => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
