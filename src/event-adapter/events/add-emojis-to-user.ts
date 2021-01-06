import pluralize from 'pluralize';

import { createAddEmojiInteractions } from '../../interactions-adapter/events/add-emoji';
import sendMessage from '../../utils/send-message';
import { getSlackBotInfo } from '../../install-provider';
import AllowedEmoji from '../../entities/AllowedEmoji';
import Leaderboard from '../../entities/Leaderboard';
import type { InsertLeaderboardData } from '../../entities/LeaderboardContent';

interface EmojisToAdd {
  emojisToSave: InsertLeaderboardData[];
  emojisNotAllowed: InsertLeaderboardData[];
}

interface EmojisToByUser {
  emojisToSaveByUserId: Record<string, InsertLeaderboardData[]>;
  emojisToToSaveLaterByUserId: Record<string, InsertLeaderboardData[]>;
}

type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;

interface AddEmojisToUserArgs {
  botInfo?: Awaited<ReturnType<typeof getSlackBotInfo>>;
  channel: string;
  emojisMatch: string[];
  givenByUserId: string;
  messageId: string;
  messageIdToDelete: string | null;
  people: string[];
  reactionId: string | null;
  teamId: string;
  threadId: string | null;
}

const addEmojisToUser = async ({
  botInfo,
  channel,
  emojisMatch,
  givenByUserId,
  messageId,
  messageIdToDelete,
  people,
  reactionId,
  teamId,
  threadId,
}: AddEmojisToUserArgs): Promise<void> => {
  const allowedEmojis = await AllowedEmoji.getAllowedEmojisByTeam(teamId);
  const { botUserId, botToken } = botInfo ?? (await getSlackBotInfo(teamId));
  const emojisNotAllowedSet = new Set<string>();
  const { emojisToSaveByUserId, emojisToToSaveLaterByUserId } = people.reduce(
    (acc: EmojisToByUser, userId: string): EmojisToByUser => {
      if (!acc.emojisToSaveByUserId[userId] && botUserId !== userId) {
        const { emojisToSave, emojisNotAllowed } = emojisMatch.reduce(
          (innerAcc: EmojisToAdd, emojiId: string): EmojisToAdd => {
            const addData = {
              channelId: channel,
              emojiId,
              givenByUserId,
              messageId,
              reactionId,
              teamId,
              userId,
            };
            if (allowedEmojis.has(emojiId)) {
              innerAcc.emojisToSave.push(addData);
            } else {
              emojisNotAllowedSet.add(emojiId);
              innerAcc.emojisNotAllowed.push(addData);
            }
            return innerAcc;
          },
          { emojisNotAllowed: [], emojisToSave: [] },
        );
        acc.emojisToSaveByUserId[userId] = emojisToSave;
        acc.emojisToToSaveLaterByUserId[userId] = emojisNotAllowed;
      }
      return acc;
    },
    { emojisToSaveByUserId: {}, emojisToToSaveLaterByUserId: {} },
  );
  const emojisToSaveLater = Object.values(emojisToToSaveLaterByUserId).flat();
  await Leaderboard.addAwards(
    Object.values(emojisToSaveByUserId).flat(),
    messageIdToDelete,
    teamId,
    channel,
    emojisToSaveLater,
  );
  if (
    emojisNotAllowedSet.size &&
    // ignore this message if one tries to do @pinata-libre add-emoji ...
    (people.length > 1 || (people.length === 1 && people[0][1] !== botUserId))
  ) {
    const emojis = Array.from(emojisNotAllowedSet);
    const emojisCount = emojis.length;
    const pluralIt = pluralize('it', emojisCount);
    await sendMessage({
      botToken,
      channel,
      content: [
        {
          text: {
            text: `>Hey, ${pluralize('this', emojisCount)} ${pluralize(
              'emoji',
              emojisCount,
            )} ${emojis.join(' ')} will not count as ${pluralize(
              'reward',
              emojisCount,
            )}. Would you like to add ${pluralIt} to your team to count as an award?`,
            type: 'mrkdwn',
          },
          type: 'section',
        },
        ...createAddEmojiInteractions(
          threadId,
          messageId,
          reactionId,
          pluralIt,
        ),
      ],
      ephemeral: { user: givenByUserId },
      teamId,
      threadId,
    });
  }
};

export default addEmojisToUser;
