import { getConnection } from 'typeorm';
import type { Express } from 'express';

import installerProvider from '../install-provider';
import { slackEvents } from '../event-adapter';

const databaseCheck = async (): Promise<void> => {
  const conn = getConnection();
  if (!conn.isConnected) {
    throw new Error('Not connected with the database');
  }
  await conn.query('select 1');
};

const createAppRoutes = (app: Express): void => {
  app.get('/.well-known/server-health', async (_, reply) => {
    try {
      await databaseCheck();
    } catch (err) {
      reply.status(500).send({ error: err.message, status: 'fail' });
      return;
    }
    reply.status(200).send({ status: 'ok' });
  });

  app.post('/slack/events', slackEvents.requestListener());

  app.get('/install', async (_, res) => {
    const url = await installerProvider.generateInstallUrl({
      scopes: [
        'app_mentions:read',
        'channels:history',
        'chat:write',
        'users.profile:read',
      ],
    });
    res.send(
      `<a href=${url}><img alt=""Add to Slack"" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>`,
    );
  });

  app.get('/slack/oauth_redirect', (req, res) =>
    installerProvider.handleCallback(req, res),
  );
};

export default createAppRoutes;
