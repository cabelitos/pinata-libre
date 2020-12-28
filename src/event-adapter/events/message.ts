import { getEmojisMatch, getMentionedPeople } from '../../utils/regex';
import sendMessage from '../../utils/send-message';
import { getSlackBotInfo } from '../../install-provider';
import AllowedEmoji from '../../entities/AllowedEmoji';
import Leaderboard from '../../entities/Leaderboard';
import type { InsertLeaderboardData } from '../../entities/LeaderboardContent';
import { createAddEmojiAttachment } from '../../interactions-adapter/events/add-emoji';

interface SlackMessage {
  ts: string;
  team: string;
  text: string;
  user: string;
  thread_ts: string | undefined;
}

interface EventBody {
  text: string | undefined;
  channel: string;
  user: string | undefined;
  team: string | undefined;
  message: SlackMessage;
  previous_message: SlackMessage;
  subtype: string | undefined;
  ts: string | undefined;
  thread_ts: string | undefined;
}
interface EmojisToAdd {
  emojisToSave: InsertLeaderboardData[];
  emojisNotAllowed: InsertLeaderboardData[];
}

interface EmojisToByUser {
  emojisToSaveByUserId: Record<string, InsertLeaderboardData[]>;
  emojisToToSaveLaterByUserId: Record<string, InsertLeaderboardData[]>;
}

const prepareMessageContext = (
  subtype: string | undefined,
  originalText: string | undefined,
  originalMessageId: string | undefined,
  message: SlackMessage,
  prevMessage: SlackMessage,
  teamId: string | undefined,
  user: string | undefined,
  threadId: string | undefined,
): Record<
  | 'textToUse'
  | 'messageIdToDelete'
  | 'messageIdToUse'
  | 'teamIdToUse'
  | 'userIdToUse'
  | 'threadIdToUse',
  string
> => {
  let textToUse = originalText;
  let messageIdToUse = originalMessageId;
  let messageIdToDelete;
  let teamIdToUse = teamId;
  let userIdToUse = user;
  let threadIdToUse = threadId;
  if (subtype === 'message_changed') {
    textToUse = message.text;
    messageIdToUse = message.ts;
    messageIdToDelete = prevMessage?.ts;
    teamIdToUse = prevMessage?.team;
    userIdToUse = message.user;
    threadIdToUse = message.thread_ts;
  } else if (subtype === 'message_deleted') {
    textToUse = prevMessage?.text;
    messageIdToDelete = prevMessage?.ts;
    teamIdToUse = prevMessage?.team;
    userIdToUse = prevMessage?.user;
    threadIdToUse = message?.thread_ts;
  }
  return {
    messageIdToDelete: messageIdToDelete ?? '',
    messageIdToUse: messageIdToUse ?? '',
    teamIdToUse: teamIdToUse ?? '',
    textToUse: textToUse ?? '',
    threadIdToUse: threadIdToUse ?? '',
    userIdToUse: userIdToUse ?? '',
  };
};

const messageEvent = async ({
  text,
  subtype,
  ts: messageId,
  previous_message: prevMessage,
  message,
  team: teamId,
  channel,
  user,
  thread_ts: threadId,
}: EventBody): Promise<void> => {
  try {
    const {
      messageIdToDelete,
      messageIdToUse,
      teamIdToUse,
      textToUse,
      userIdToUse,
      threadIdToUse,
    } = prepareMessageContext(
      subtype,
      text,
      messageId,
      message,
      prevMessage,
      teamId,
      user,
      threadId,
    );
    const emojisMatch = getEmojisMatch(textToUse);
    const people = getMentionedPeople(textToUse);
    if (!people || !people.length) return;
    if (subtype === 'message_deleted' && messageIdToDelete && emojisMatch) {
      await Leaderboard.deleteAwards(messageIdToDelete, teamIdToUse, channel);
      return;
    }

    if (!emojisMatch || !emojisMatch.length) return;

    const allowedEmojis = await AllowedEmoji.getAllowedEmojisByTeam(
      teamIdToUse,
    );

    const { botUserId, botToken } = await getSlackBotInfo(teamIdToUse);
    const emojisNotAllowedSet = new Set<string>();
    const { emojisToSaveByUserId, emojisToToSaveLaterByUserId } = people.reduce(
      (acc: EmojisToByUser, match: RegExpMatchArray): EmojisToByUser => {
        const userId = match[1];
        if (!acc.emojisToSaveByUserId[userId] && botUserId !== userId) {
          const { emojisToSave, emojisNotAllowed } = emojisMatch.reduce(
            (innerAcc: EmojisToAdd, emojiId: string): EmojisToAdd => {
              const addData = {
                channelId: channel,
                emojiId,
                givenByUserId: userIdToUse,
                messageId: messageIdToUse,
                teamId: teamIdToUse,
                userId,
              };
              if (allowedEmojis.has(emojiId)) {
                innerAcc.emojisToSave.push(addData);
              } else {
                emojisNotAllowedSet.add(emojiId);
                innerAcc.emojisNotAllowed.push(addData);
              }
              return innerAcc;
            },
            { emojisNotAllowed: [], emojisToSave: [] },
          );
          acc.emojisToSaveByUserId[userId] = emojisToSave;
          acc.emojisToToSaveLaterByUserId[userId] = emojisNotAllowed;
        }
        return acc;
      },
      { emojisToSaveByUserId: {}, emojisToToSaveLaterByUserId: {} },
    );
    const emojisToSaveLater = Object.values(emojisToToSaveLaterByUserId).flat();
    await Leaderboard.addAwards(
      Object.values(emojisToSaveByUserId).flat(),
      messageIdToDelete,
      teamIdToUse,
      channel,
      emojisToSaveLater,
    );
    if (
      emojisNotAllowedSet.size &&
      // ignore this message if one tries to do @pinata-libre add-emoji ...
      (people.length > 1 || (people.length === 1 && people[0][1] !== botUserId))
    ) {
      const emojis = Array.from(emojisNotAllowedSet);
      await sendMessage({
        attachments: createAddEmojiAttachment(threadIdToUse, messageIdToUse),
        botToken,
        channel,
        content: [
          {
            text: {
              emoji: true,
              text: `Hey, these emoji${
                emojisToSaveLater.length === 1 ? '' : 's'
              } ${emojis.join(
                ' ',
              )} will not count as reward. Would you like to add it to your team to count as an award?`,
              type: 'plain_text',
            },
            type: 'section',
          },
        ],
        ephemeral: { user: userIdToUse },
        teamId: teamIdToUse,
        threadId: threadIdToUse,
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
};

export default messageEvent;
