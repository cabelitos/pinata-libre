import { getEmojisMatch, getMentionedPeople } from '../../utils/regex';
import sendMessage from '../../utils/send-message';
import { getSlackBotInfo } from '../../install-provider';
import AllowedEmoji from '../../entities/AllowedEmoji';
import Leaderboard, { InsertLeaderboardData } from '../../entities/Leaderboard';

interface SlackMessage {
  client_msg_id: string;
  team: string;
  text: string;
  user: string;
}

interface EventBody {
  text: string | undefined;
  channel: string;
  user: string | undefined;
  team: string | undefined;
  message: SlackMessage;
  previous_message: SlackMessage;
  subtype: string | undefined;
  client_msg_id: string | undefined;
}

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

const messageEvent = async ({
  text,
  subtype,
  client_msg_id: messageId,
  previous_message: prevMessage,
  message,
  team: teamId,
  channel,
  user,
}: EventBody): Promise<void> => {
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
    const emojisMatch = getEmojisMatch(textToUse);
    const people = getMentionedPeople(textToUse);
    if (!people || !people.length) return;
    if (subtype === 'message_deleted' && messageIdToDelete && emojisMatch) {
      await Leaderboard.deleteAwards(messageIdToDelete, teamIdToUse);
      return;
    }

    if (!emojisMatch || !emojisMatch.length) return;

    const allowedEmojis = await AllowedEmoji.getAllowedEmojisByTeam(
      teamIdToUse,
    );

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

    const { botUserId, botToken } = await getSlackBotInfo(teamIdToUse);
    const emojiToSave = people.reduce(
      (
        acc: Record<string, InsertLeaderboardData[]>,
        match: RegExpMatchArray,
      ): Record<string, InsertLeaderboardData[]> => {
        const userId = match[1];
        if (!acc[userId] && botUserId !== userId) {
          acc[userId] = emojisToAdd.map(emojiId => ({
            emojiId,
            givenByUserId: userIdToUse,
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
    if (
      emojisNotAllowed.length &&
      // ignore this message if one tries to do @pinata-libre add-emoji ...
      (people.length > 1 || (people.length === 1 && people[0][1] !== botUserId))
    ) {
      const emojis = emojisNotAllowed.join(' ');
      await sendMessage({
        botToken,
        channel,
        content: `Hey, these emojis ${emojis} will not count as reward. Please add it by using the following command: \`@[bot-name] add-emoji ${emojis}\``,
        ephemeral: { user: userIdToUse },
        teamId: teamIdToUse,
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
};

export default messageEvent;
