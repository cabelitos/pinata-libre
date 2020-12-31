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

type Handler = (arg: { delete_original: boolean }) => void;

const dismissLeaderboard = (_: unknown, respond: Handler): void => {
  respond({ delete_original: true });
};

export default dismissLeaderboard;
