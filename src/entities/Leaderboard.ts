import {
  Entity,
  getManager,
  EntityManager,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

import AllowedEmoji from './AllowedEmoji';
import LeaderboardContent, {
  InsertLeaderboardData,
} from './LeaderboardContent';
import PendingLeaderbordContent from './PendingLeaderbordContent';

export interface LeaderboardData {
  awardCount: string;
  userId: string;
  emojiId: string;
}

const getLeaderboardLimit = (): number => {
  const limit = parseInt(process.env.LEADERBOARD_LIMIT ?? '10', 10) ?? 10;
  return Number.isNaN(limit) ? 10 : limit;
};

@Entity()
export default class Leaderboard extends LeaderboardContent {
  @ManyToOne('AllowedEmoji')
  @JoinColumn([
    { name: 'emojiId', referencedColumnName: 'id' },
    { name: 'teamId', referencedColumnName: 'teamId' },
  ])
  emoji: AllowedEmoji;

  public static readonly leaderboardLimit = getLeaderboardLimit();

  private static async deleteTransaction(
    messageIdToDelete: string,
    teamId: string,
    channelId: string,
    manager: EntityManager,
  ): Promise<void> {
    await manager.softDelete(Leaderboard, {
      channelId,
      messageId: messageIdToDelete,
      teamId,
    });
    await PendingLeaderbordContent.deleteAwards(
      messageIdToDelete,
      teamId,
      channelId,
      manager,
    );
  }

  static deleteAwards(
    messageIdToDelete: string,
    teamId: string,
    channelId: string,
    manager?: EntityManager,
  ): Promise<unknown> {
    return manager
      ? Leaderboard.deleteTransaction(
          messageIdToDelete,
          teamId,
          channelId,
          manager,
        )
      : getManager().transaction(
          (innerManager: EntityManager): Promise<void> =>
            Leaderboard.deleteTransaction(
              messageIdToDelete,
              teamId,
              channelId,
              innerManager,
            ),
        );
  }

  static async addAwards(
    people: InsertLeaderboardData[],
    messageIdToDelete: string | null,
    teamId: string,
    channelId: string,
    pendingData: InsertLeaderboardData[],
  ): Promise<void> {
    return getManager().transaction(
      async (manager: EntityManager): Promise<void> => {
        if (messageIdToDelete) {
          await Leaderboard.deleteAwards(
            messageIdToDelete,
            teamId,
            channelId,
            manager,
          );
        }
        await PendingLeaderbordContent.insertPendingContent(
          pendingData,
          messageIdToDelete,
          teamId,
          channelId,
          manager,
        );
        await manager
          .createQueryBuilder()
          .insert()
          .into(Leaderboard)
          .values(people)
          .execute();
      },
    );
  }

  static async getLeaderboard(teamId: string): Promise<LeaderboardData[]> {
    const data = await getManager()
      .createQueryBuilder(Leaderboard, 'lb')
      .select('lb.userId, lb.emojiId, count(*) as "awardCount"')
      .innerJoin(
        subQuery =>
          subQuery
            .select('count(*) as "awardCount", innerLb.userId')
            .from(Leaderboard, 'innerLb')
            .where('innerLb.teamId = :teamId ', { teamId })
            .groupBy('innerLb.userId')
            .orderBy('"awardCount"', 'DESC')
            .limit(Leaderboard.leaderboardLimit),
        'innerLb',
        'innerLb.userId = lb.userId',
      )
      .groupBy('lb.userId, lb.emojiId')
      .execute();
    return data ?? [];
  }
}
