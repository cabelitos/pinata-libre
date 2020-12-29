import {
  WebClient,
  Block,
  KnownBlock,
  MessageAttachment,
} from '@slack/web-api';

import { getSlackBotInfo } from '../install-provider';

interface SendMessageParams {
  attachments?: MessageAttachment[];
  botToken?: string;
  content: string | (Block | KnownBlock)[];
  channel: string;
  threadId?: string | null;
  teamId: string;
  ephemeral?: { user: string };
}

const sendMessage = async ({
  attachments,
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
      attachments,
      blocks,
      channel,
      text: '',
      thread_ts: threadId,
      user: ephemeral.user,
    });
    return;
  }
  await web.chat.postMessage({
    attachments,
    blocks,
    channel,
    text: '',
    thread_ts: threadId || undefined,
  });
};

export default sendMessage;
