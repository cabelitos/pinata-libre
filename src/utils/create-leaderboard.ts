import { WebClient } from '@slack/web-api';
import type { Block, KnownBlock } from '@slack/web-api';

import Leaderboard from '../entities/Leaderboard';

interface SlackProfile {
  real_name: string;
  image_192: string;
}

interface LeaderboardCtx {
  total: number;
  profile: SlackProfile;
  emojis: { total: number; emojiId: string }[];
}
const sortByTotal = <T extends { total: number }>(
  { total: totalA }: T,
  { total: totalB }: T,
): number => {
  if (totalA > totalB) return -1;
  if (totalA < totalB) return 1;
  return 0;
};

const awardsByEmoji = (arr: LeaderboardCtx['emojis']): string =>
  arr
    .sort(sortByTotal)
    .reduce(
      (acc, { total, emojiId }): string =>
        `${acc}\n${emojiId}   ${total} award${total === 1 ? '' : 's'}`,
      '',
    );

const createLeaderboard = async (
  team: string,
  botToken: string | undefined,
): Promise<string | (Block | KnownBlock)[]> => {
  const data = await Leaderboard.getLeaderboard(team);
  if (!data.length) {
    return 'Leaderboard is empty. Starting sending recognitions! :taco: :burrito:';
  }
  const client = new WebClient(botToken);
  const leaderBoardCtx: Record<string, LeaderboardCtx> = {};

  await Promise.all(
    data.map(
      async ({ userId, awardCount, emojiId }): Promise<void> => {
        if (!leaderBoardCtx[userId]) {
          leaderBoardCtx[userId] = {
            emojis: [],
            profile: (null as unknown) as SlackProfile,
            total: 0,
          };
          const { ok, profile } = await client.users.profile.get({
            user: userId,
          });
          if (!ok) {
            throw new Error(`Could not fetch profile for user ${userId}`);
          }
          leaderBoardCtx[userId].profile = profile as SlackProfile;
        }
        const parsedNumber = parseInt(awardCount, 10);
        leaderBoardCtx[userId].total += parsedNumber;
        leaderBoardCtx[userId].emojis.push({
          emojiId,
          total: parsedNumber,
        });
      },
    ),
  );
  const leaderboardContent = Object.values(leaderBoardCtx)
    .sort(sortByTotal)
    .map(({ total, emojis, profile: { real_name: name, image_192: image } }): (
      | Block
      | KnownBlock
    )[] => [
      {
        accessory: {
          alt_text: `${name} user photo`,
          image_url: image,
          type: 'image',
        },
        text: {
          text: `*${name}*\n\nEmojis Awarded:\n\n${awardsByEmoji(emojis)}`,
          type: 'mrkdwn',
        },
        type: 'section',
      },
      {
        text: {
          text: `Total: ${total} award${total === 1 ? '' : 's'}`,
          type: 'mrkdwn',
        },
        type: 'section',
      },
      {
        type: 'divider',
      },
    ]);
  return [
    {
      text: {
        text: 'Hey this is the current leaderboard!',
        type: 'mrkdwn',
      },
      type: 'section',
    },
    ...leaderboardContent.flat(),
  ];
};

export default createLeaderboard;
