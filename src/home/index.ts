import type { View } from '@slack/web-api';

import Leaderboard from '../entities/Leaderboard';
import AllowedEmoji from '../entities/AllowedEmoji';

const createAwardText = (awards: number, given: boolean): string =>
  `You ${given ? 'gave' : 'received'} ${awards} ${
    awards === 1 ? 'award' : 'awards'
  }`;

const createHomeScreen = async (
  teamId: string,
  userId: string,
): Promise<View> => {
  const [myAwards, givenAwards, allowedEmojis] = await Promise.all([
    Leaderboard.count({ where: { teamId, userId } }),
    Leaderboard.count({ where: { givenByUserId: userId, teamId } }),
    AllowedEmoji.find({ select: ['id'], where: { teamId } }),
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
      {
        text: {
          emoji: true,
          text: 'Allowed emojis for your team',
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
          text: allowedEmojis.map(({ id }) => id).join(' '),
          type: 'plain_text',
        },
        type: 'section',
      },
      {
        elements: [
          {
            text: 'Use `@[bot-name] add-emoji :emojiCode:` to add more',
            type: 'mrkdwn',
          },
        ],
        type: 'context',
      },
    ],
    type: 'home',
  };
};

export default createHomeScreen;
