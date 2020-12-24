import { WebClient, Block, KnownBlock } from '@slack/web-api';

import { getSlackBotInfo } from '../install-provider';

interface SendMessageParams {
  botToken?: string;
  content: string | (Block | KnownBlock)[];
  channel: string;
  threadId?: string;
  teamId: string;
  ephemeral?: { user: string };
}

const sendMessage = async ({
  botToken,
  channel,
  content,
  ephemeral,
  teamId,
  threadId,
}: SendMessageParams): Promise<void> => {
  const web = new WebClient(
    botToken ?? (await getSlackBotInfo(teamId)).botToken,
  );
  const blocks =
    typeof content === 'string'
      ? [
          {
            text: {
              text: content,
              type: 'mrkdwn',
            },
            type: 'section',
          },
        ]
      : content;
  if (ephemeral) {
    await web.chat.postEphemeral({
      blocks,
      channel,
      text: '',
      user: ephemeral.user,
    });
    return;
  }
  await web.chat.postMessage({
    blocks,
    channel,
    text: '',
    thread_ts: threadId,
  });
};

export default sendMessage;
