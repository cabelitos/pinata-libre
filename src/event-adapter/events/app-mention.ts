import AllowedEmoji from '../../entities/AllowedEmoji';
import createLeaderboard from '../../utils/create-leaderboard';
import { getEmojisMatch, getMentionedPeople } from '../../utils/regex';
import { getSlackBotInfo } from '../../install-provider';
import sendMessage from '../../utils/send-message';

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

interface EventInfo {
  channel: string;
  team: string;
  text: string;
  thread_ts: string;
  user: string;
}

const commands: Command[] = [
  {
    handler: async (
      channel: string,
      threadId: string | undefined,
      teamId: string,
      user: string,
    ): Promise<void> => {
      const { botToken } = await getSlackBotInfo(teamId);
      const content = await createLeaderboard(teamId, botToken);
      await sendMessage({
        botToken,
        channel,
        content,
        ephemeral: { user },
        teamId,
        threadId,
      });
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
      const emojisMatch = getEmojisMatch(args);
      if (!emojisMatch) return;
      try {
        await AllowedEmoji.makeAllowedEmojis(emojisMatch, teamId);
      } catch {
        try {
          await sendMessage({
            channel,
            content: `Something wrong has ocurred and I could not add the emojis ${args} to the app. Sorry :expressionless:`,
            ephemeral: { user },
            teamId,
            threadId,
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error(err);
        }
      }
    },
    regex: 'add-emoji\\s+(.+)*',
  },
];

const appMention = async ({
  channel,
  team,
  text,
  thread_ts: threadId,
  user,
}: EventInfo): Promise<void> => {
  try {
    const people = await getMentionedPeople(text);
    if (people.length !== 1) return;
    const botId = people[0];
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
};

export default appMention;
