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
  try {
    if (tab !== 'home') return;
    const { botToken } = await getSlackBotInfo(teamId);
    const view = await createHomeScreen(teamId, user, botToken);
    await new WebClient(botToken).views.publish({
      user_id: user,
      view,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
};

export default appHomeOpened;
