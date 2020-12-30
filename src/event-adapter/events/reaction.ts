import { WebClient } from '@slack/web-api';

import { getSlackBotInfo } from '../../install-provider';
import type { EventRawBody } from '../../utils/types';
import { getEmojisMatch, getMentionedPeople } from '../../utils/regex';
import addEmojisToUser from './add-emojis-to-user';
import Leaderboard from '../../entities/Leaderboard';

interface ReactionEvent {
  event_ts: string;
  reaction: string;
  user: string;
  item: {
    channel: string;
    ts: string;
    type: 'message' | 'file';
  };
}

interface HistoryPayload {
  messages: { text: string; ts: string }[];
}

const fetchMessageData = async (
  botToken: string | undefined,
  channel: string,
  latest: string,
): Promise<string> => {
  const client = new WebClient(botToken);
  const apiPayload = {
    channel,
    inclusive: true,
    latest,
    limit: 1,
  };
  let msg = ((await client.conversations.history(
    apiPayload,
  )) as unknown) as HistoryPayload;
  const {
    messages: [{ text, ts: found }],
  } = msg;
  // Not the original, should be a thread
  if (found !== latest) {
    msg = ((await client.conversations.replies({
      ...apiPayload,
      ts: latest,
    })) as unknown) as HistoryPayload;
    return msg.messages[0].text;
  }
  return text;
};

const createReactionEvent = (
  wasAdded: boolean,
): ((args: ReactionEvent, rawBody: EventRawBody) => Promise<void>) => async (
  {
    event_ts: reactionId,
    item: { type, channel, ts: latest },
    reaction,
    user,
  }: ReactionEvent,
  { team_id: teamId }: EventRawBody,
): Promise<void> => {
  try {
    if (type !== 'message') return;
    const emojiId = `:${reaction}:`;
    if (!wasAdded) {
      await Leaderboard.deleteReactions(teamId, channel, latest, emojiId, user);
      return;
    }
    const botInfo = await getSlackBotInfo(teamId);
    const text = await fetchMessageData(botInfo.botToken, channel, latest);
    const emojisMatch = getEmojisMatch(text);
    /*
      Filter self.
      In case someone gives an award the the receiving user
      reacts this message. Do not count it as award.
    */
    const people = (await getMentionedPeople(text, botInfo.botToken)).filter(
      id => id !== user,
    );
    // If not an award, just ignore.
    if (!people.length || !emojisMatch?.length) return;
    await addEmojisToUser({
      botInfo,
      channel,
      emojisMatch: [emojiId],
      givenByUserId: user,
      messageId: latest,
      messageIdToDelete: null,
      people,
      reactionId,
      teamId,
      threadId: null,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
};

export default createReactionEvent;
