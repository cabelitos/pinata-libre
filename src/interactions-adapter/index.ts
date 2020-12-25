import { createMessageAdapter } from '@slack/interactive-messages';

import addEmoji, { addEmojiEventAction } from './events/add-emoji';

export const slackInteractions = createMessageAdapter(
  process.env.SLACK_SIGN_SECRET ?? '',
);

const createInteractionHandlers = (): void => {
  slackInteractions.action(addEmojiEventAction, addEmoji);
};

export default createInteractionHandlers;
