import { createEventAdapter } from '@slack/events-api';

import appHomeOpened from './events/app-home-opened';
import appMention from './events/app-mention';
import message from './events/message';
import createReactionEvent from './events/reaction';

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
  slackEvents.on('reaction_added', createReactionEvent(true));
  slackEvents.on('reaction_removed', createReactionEvent(false));
};

export default createEventHandlers;
