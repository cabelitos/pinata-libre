import type { View } from '@slack/web-api';

import Leaderboard from '../entities/Leaderboard';

const createAwardText = (awards: number, given: boolean): string =>
  `You ${given ? 'gave' : 'received'} ${awards} ${
    awards === 1 ? 'award' : 'awards'
  }`;

const createHomeScreen = async (
  teamId: string,
  userId: string,
): Promise<View> => {
  const [myAwards, givenAwards] = await Promise.all([
    Leaderboard.count({ where: { teamId, userId } }),
    Leaderboard.count({ where: { givenByUserId: userId, teamId } }),
  ]);
  return {
    blocks: [
      {
        text: {
          emoji: true,
          text: 'My awards :tada: :taco: :burrito:',
          type: 'plain_text',
        },
        type: 'header',
      },
      {
        type: 'divider',
      },
      {
        text: {
          emoji: true,
          text: createAwardText(myAwards, false),
          type: 'plain_text',
        },
        type: 'section',
      },
      {
        text: {
          emoji: true,
          text: 'Given awards :gift:',
          type: 'plain_text',
        },
        type: 'header',
      },
      {
        type: 'divider',
      },
      {
        text: {
          emoji: true,
          text: createAwardText(givenAwards, true),
          type: 'plain_text',
        },
        type: 'section',
      },
    ],
    type: 'home',
  };
};

export default createHomeScreen;
