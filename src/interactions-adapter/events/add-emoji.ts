import type { KnownBlock } from '@slack/web-api';

import PendingLeaderboardContent from '../../entities/PendingLeaderbordContent';
import type { InteractionResponseHandler } from '../../utils/types';

const separator = '_';
const addEmojiEventPrefix = `add${separator}emoji`;

export const addEmojiEventAction = {
  actionId: new RegExp(`${addEmojiEventPrefix}${separator}(.+)`),
};

interface EventBody {
  actions: { action_id: string; value: string }[];
  channel: { id: string };
  team: { id: string };
}

const createEmojiActionId = (
  threadId: string | null,
  messageId: string,
  reactionId: string | null,
  isPrimary: boolean,
): string =>
  `${addEmojiEventPrefix}${separator}${threadId || 'null'}${separator}${
    reactionId || 'null'
  }${separator}${messageId}${separator}${isPrimary ? '1' : '0'}`;

export const createAddEmojiInteractions = (
  threadId: string | null,
  messageId: string,
  reactionId: string | null,
  pluralIt: string,
): KnownBlock[] => [
  {
    elements: [
      {
        action_id: createEmojiActionId(threadId, messageId, reactionId, true),
        style: 'primary',
        text: {
          emoji: true,
          text: `Please, add ${pluralIt}!`,
          type: 'plain_text',
        },
        type: 'button',
        value: '1',
      },
      {
        action_id: createEmojiActionId(threadId, messageId, reactionId, false),
        style: 'danger',
        text: {
          emoji: true,
          text: `Ignore ${pluralIt}!`,
          type: 'plain_text',
        },
        type: 'button',
        value: '0',
      },
    ],
    type: 'actions',
  },
];

const doOperation = async (
  msgId: string,
  channelId: string,
  teamId: string,
  reactionId: string | undefined,
  threadId: string | undefined,
  value: string,
  response: InteractionResponseHandler,
): Promise<void> => {
  let text = '>Ok, not adding as award :crying_cat_face:.';
  if (value === '1') {
    text = '>Great, the award was added :tada:!';
    await PendingLeaderboardContent.commitAwards(
      msgId,
      teamId,
      channelId,
      reactionId,
    );
  } else {
    await PendingLeaderboardContent.deleteAwards(
      msgId,
      teamId,
      channelId,
      reactionId,
    );
  }
  response({
    replace_original: true,
    response_type: 'ephemeral',
    text,
    thread_ts: threadId,
  });
};

const addEmoji = (
  {
    actions: [{ action_id: actionId, value }],
    channel: { id: channelId },
    team: { id: teamId },
  }: EventBody,
  response: InteractionResponseHandler,
): void => {
  const [_, __, threadId, reactionId, msgId] = actionId.split('_');
  const finalThreadId = threadId === 'null' ? undefined : threadId;
  const finalReactionId = reactionId === 'null' ? undefined : reactionId;
  /*
   Slack recommends that interaction handlers do should not return ANY value from handlers when using block messages.
   In this case, the handler entry point should not be an async function, which would make it to implicitly return
   a Promise.
  */
  doOperation(
    msgId,
    channelId,
    teamId,
    finalReactionId,
    finalThreadId,
    value,
    response,
  ).catch(err => {
    // eslint-disable-next-line no-console
    console.error(err);
    response({
      replace_original: true,
      response_type: 'ephemeral',
      text: 'Oops, could not perform the operation :crying_cat_face:.',
      thread_ts: finalThreadId,
    });
  });
};

export default addEmoji;
