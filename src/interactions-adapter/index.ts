import { createMessageAdapter } from '@slack/interactive-messages';

import addEmoji, { addEmojiEventAction } from './events/add-emoji';
import dismissLeaderboard, {
  dismissLeaderboardAction,
} from './events/dismiss-leaderboard';

export const slackInteractions = createMessageAdapter(
  process.env.SLACK_SIGN_SECRET ?? '',
);

const createInteractionHandlers = (): void => {
  slackInteractions.action(dismissLeaderboardAction, dismissLeaderboard);
  slackInteractions.action(addEmojiEventAction, addEmoji);
};

export default createInteractionHandlers;
