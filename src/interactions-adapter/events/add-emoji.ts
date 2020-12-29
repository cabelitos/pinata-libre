import type { MessageAttachment } from '@slack/web-api';

import PendingLeaderboardContent from '../../entities/PendingLeaderbordContent';

const separator = '_';
const addEmojiEventPrefix = `add${separator}emoji`;

export const addEmojiEventAction = new RegExp(
  `${addEmojiEventPrefix}${separator}(.+)`,
);

interface EventBody {
  actions: { value: string }[];
  channel: { id: string };
  callback_id: string;
  team: { id: string };
}

export const crateAddEmojiCallbackId = (
  threadId: string | null,
  messageId: string,
  reactionId: string | null,
): string =>
  `${addEmojiEventPrefix}${separator}${threadId || 'null'}${separator}${
    reactionId || 'null'
  }${separator}${messageId}`;

export const createAddEmojiAttachment = (
  threadId: string | null,
  messageId: string,
  reactionId: string | null,
): MessageAttachment[] => [
  {
    actions: [
      {
        name: addEmojiEventPrefix,
        style: 'primary',
        text: 'Please, add it!',
        type: 'button',
        value: '1',
      },
      {
        name: addEmojiEventPrefix,
        style: 'danger',
        text: 'Ignore it!',
        type: 'button',
        value: '0',
      },
    ],
    callback_id: crateAddEmojiCallbackId(threadId, messageId, reactionId),
    color: '#9a07f5',
    fallback: 'Could not display actions',
  },
];

const addEmoji = async ({
  actions: [{ value }],
  channel: { id: channelId },
  callback_id: callbackId,
  team: { id: teamId },
}: EventBody): Promise<unknown> => {
  const [_, __, threadId, reactionId, msgId] = callbackId.split('_');
  const finalThreadId = threadId === 'null' ? undefined : threadId;
  const finalReactionId = reactionId === 'null' ? undefined : reactionId;
  try {
    let text = '>Ok, not adding as award :crying_cat_face:.';
    if (value === '1') {
      text = '>Great the award was added :tada:!';
      await PendingLeaderboardContent.commitAwards(
        msgId,
        teamId,
        channelId,
        finalReactionId,
      );
    } else {
      await PendingLeaderboardContent.deleteAwards(
        msgId,
        teamId,
        channelId,
        finalReactionId,
      );
    }
    return {
      replace_original: true,
      response_type: 'ephemeral',
      text,
      thread_ts: finalThreadId,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    return {
      replace_original: true,
      response_type: 'ephemeral',
      text: 'Oops, could not perform the operation :crying_cat_face:.',
      thread_ts: finalThreadId,
    };
  }
};

export default addEmoji;
