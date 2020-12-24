import { WebClient } from '@slack/web-api';

import createHomeScreen from '../../home';
import { getSlackBotInfo } from '../../install-provider';

interface EventBody {
  team_id: string;
}

interface EventInfo {
  user: string;
  tab: 'home' | 'messages';
}

const appHomeOpened = async (
  { user, tab }: EventInfo,
  { team_id: teamId }: EventBody,
): Promise<void> => {
  try {
    if (tab !== 'home') return;
    const view = await createHomeScreen(teamId, user);
    const { botToken } = await getSlackBotInfo(teamId);
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
