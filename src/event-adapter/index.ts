import { createEventAdapter } from '@slack/events-api';

import appHomeOpened from './events/app-home-opened';
import appMention from './events/app-mention';
import message from './events/message';

export const slackEvents = createEventAdapter(
  process.env.SLACK_SIGN_SECRET ?? '',
  {
    includeBody: true,
  },
);

const createEventHandlers = (): void => {
  slackEvents.on('app_home_opened', appHomeOpened);
  slackEvents.on('app_mention', appMention);
  slackEvents.on('message', message);
};

export default createEventHandlers;
