import type { View, Option } from '@slack/web-api';

import Leaderboard from '../entities/Leaderboard';
import AllowedEmoji from '../entities/AllowedEmoji';
import DoNotAskForAddEmojis from '../entities/DoNotAskForAddEmojis';

import createLeaderboard from '../utils/create-leaderboard';

import { createDoNotAskForEmojisActionId } from '../interactions-adapter/events/add-emoji';

const createAwardText = (awards: number, given: boolean): string =>
  `You ${given ? 'gave' : 'received'} ${awards} ${
    awards === 1 ? 'award' : 'awards'
  }`;

const yesOption: Option = {
  text: {
    text: 'Yes',
    type: 'plain_text',
  },
  value: 'yes',
};

const noOption: Option = {
  text: {
    text: 'No',
    type: 'plain_text',
  },
  value: 'no',
};

const createHomeScreen = async (
  teamId: string,
  userId: string,
  botToken: string | undefined,
): Promise<View> => {
  const [
    myAwards,
    givenAwards,
    allowedEmojis,
    leaderboardData,
    shouldAskForNewEmojis,
  ] = await Promise.all([
    Leaderboard.count({ where: { teamId, userId } }),
    Leaderboard.count({ where: { givenByUserId: userId, teamId } }),
    AllowedEmoji.find({ select: ['id'], where: { teamId } }),
    createLeaderboard(teamId, botToken, false),
    DoNotAskForAddEmojis.count({ where: { teamId, userId } }),
  ]);
  return {
    blocks: [
      {
        text: {
          emoji: true,
          text: 'Should I ask you to add new emojis automatically?',
          type: 'plain_text',
        },
        type: 'header',
      },
      {
        type: 'divider',
      },
      {
        elements: [
          {
            action_id: createDoNotAskForEmojisActionId(null),
            initial_option: shouldAskForNewEmojis === 1 ? noOption : yesOption,
            options: [yesOption, noOption],
            type: 'radio_buttons',
          },
        ],
        type: 'actions',
      },
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
          text: allowedEmojis.map(({ id }) => id).join(' ') || 'No emojis',
          type: 'plain_text',
        },
        type: 'section',
      },
      {
        elements: [
          {
            text: 'Use `@PinataLibre add-emoji :emojiCode:` to add more',
            type: 'mrkdwn',
          },
        ],
        type: 'context',
      },
      ...leaderboardData,
      {
        elements: [
          {
            text:
              'Piñata icon provided by <https://www.flaticon.com/br/autores/freepik|Freepik> from <https://www.flaticon.com/|Flaticon>',
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
