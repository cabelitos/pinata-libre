import { Entity, EntityManager, getManager } from 'typeorm';

import LeaderboardContent, {
  InsertLeaderboardData,
} from './LeaderboardContent';

import AllowedEmoji from './AllowedEmoji';

@Entity()
export default class PendingLeaderboardContent extends LeaderboardContent {
  static deleteAwards(
    messageIdToDelete: string,
    teamId: string,
    manager?: EntityManager,
  ): Promise<unknown> {
    return (manager ?? getManager()).delete(PendingLeaderboardContent, {
      messageId: messageIdToDelete,
      teamId,
    });
  }

  static commitAwards(msgId: string, teamId: string): Promise<void> {
    return getManager().transaction(
      async (manager: EntityManager): Promise<void> => {
        await manager.query(
          'INSERT OR REPLACE INTO allowed_emoji (id, teamId, createdAt, deletedAt) SELECT emojiId AS id, teamId, datetime("now"), NULL from pending_leaderboard_content WHERE teamId = ? and messageId = ? and deletedAt IS NULL GROUP BY emojiId',
          [teamId, msgId],
        );
        await manager.query(
          'INSERT INTO leaderboard SELECT * from pending_leaderboard_content WHERE teamId = ? and messageId = ? and deletedAt IS NULL',
          [teamId, msgId],
        );
        await PendingLeaderboardContent.deleteAwards(msgId, teamId, manager);
        AllowedEmoji.clearCacheForTeam(teamId);
      },
    );
  }

  static async insertPendingContent(
    data: InsertLeaderboardData[],
    messageIdToDelete: string | null,
    teamId: string,
    manager: EntityManager,
  ): Promise<unknown> {
    if (messageIdToDelete) {
      await PendingLeaderboardContent.deleteAwards(
        messageIdToDelete,
        teamId,
        manager,
      );
    }
    return manager
      .createQueryBuilder()
      .insert()
      .into(PendingLeaderboardContent)
      .values(data)
      .execute();
  }
}
