import type { InteractionResponseHandler } from '../../utils/types';

const actionId = 'dismissLeaderboard';

export const dismissLeaderboardAction = { actionId };

export const dismissLeaderboardBlock = {
  elements: [
    {
      action_id: actionId,
      style: 'danger',
      text: {
        emoji: true,
        text: 'Dismiss',
        type: 'plain_text',
      },
      type: 'button',
    },
  ],
  type: 'actions',
};

const dismissLeaderboard = (
  _: unknown,
  response: InteractionResponseHandler,
): void => {
  response({ delete_original: true });
};

export default dismissLeaderboard;
