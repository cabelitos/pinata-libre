import { getEmojisMatch, getMentionedPeople } from '../../utils/regex';
import Leaderboard from '../../entities/Leaderboard';
import addEmojisToUser from './add-emojis-to-user';

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
    await addEmojisToUser({
      channel,
      emojisMatch,
      givenByUserId: userIdToUse,
      messageId: messageIdToUse,
      messageIdToDelete,
      people,
      reactionId: null,
      teamId: teamIdToUse,
      threadId: threadIdToUse,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
};

export default messageEvent;
