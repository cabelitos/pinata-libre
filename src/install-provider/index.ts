// eslint-disable-next-line filenames/match-exported
import { InstallProvider, Installation } from '@slack/oauth';

import SlackInstallation from '../entities/SlackInstallation';

const installer = new InstallProvider({
  authVersion: 'v2',
  clientId: process.env.SLACK_CLIENT_ID ?? '',
  clientSecret: process.env.SLACK_CLIENT_SECRET ?? '',
  installationStore: {
    fetchInstallation: (installQuery): Promise<Installation<'v2', false>> => {
      if (!installQuery.teamId) throw new Error('Not supported');
      return (SlackInstallation.getInstallation(
        installQuery.teamId,
      ) as unknown) as Promise<Installation<'v2', false>>;
    },
    storeInstallation: async (installation: Installation): Promise<void> => {
      if (!installation.team?.id) throw new Error('Not supported');
      await SlackInstallation.createInstallation(
        installation.team.id,
        installation,
      );
    },
  },
  stateSecret: process.env.SLACK_STORE_SECRET ?? '',
});

export default installer;
