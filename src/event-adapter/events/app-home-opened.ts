import { WebClient } from '@slack/web-api';

import createHomeScreen from '../../home';
import { getSlackBotInfo } from '../../install-provider';
import type { EventRawBody } from '../../utils/types';

interface EventInfo {
  user: string;
  tab: 'home' | 'messages';
}

const appHomeOpened = async (
  { user, tab }: EventInfo,
  { team_id: teamId }: EventRawBody,
): Promise<void> => {
  let botToken: string | undefined = '';
  const client = new WebClient();
  try {
    if (tab !== 'home') return;
    ({ botToken } = await getSlackBotInfo(teamId));
    const view = await createHomeScreen(teamId, user, botToken);
    await client.views.publish({
      token: botToken,
      user_id: user,
      view,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    await client.views.publish({
      token: botToken,
      user_id: user,
      view: {
        blocks: [
          {
            text: {
              emoji: true,
              text: 'Error',
              type: 'plain_text',
            },
            type: 'header',
          },
          {
            text: {
              emoji: true,
              text: 'Could not load the homescreen :crying_cat_face:.',
              type: 'plain_text',
            },
            type: 'section',
          },
        ],
        type: 'home',
      },
    });
  }
};

export default appHomeOpened;
