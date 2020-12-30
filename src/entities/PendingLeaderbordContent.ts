import {
  Entity,
  EntityManager,
  getManager,
  DeleteResult,
  Not,
  IsNull,
} from 'typeorm';

import LeaderboardContent, {
  InsertLeaderboardData,
} from './LeaderboardContent';

import AllowedEmoji from './AllowedEmoji';

@Entity()
export default class PendingLeaderboardContent extends LeaderboardContent {
  static deleteAwards(
    messageIdToDelete: string,
    teamId: string,
    channelId: string,
    reactionId: string | undefined,
    manager?: EntityManager,
  ): Promise<DeleteResult> {
    return (manager ?? getManager()).delete(PendingLeaderboardContent, {
      channelId,
      messageId: messageIdToDelete,
      reactionId: reactionId !== undefined ? reactionId : IsNull(),
      teamId,
    });
  }

  static deleteReactions(
    teamId: string,
    channelId: string,
    messageId: string,
    emojiId: string,
    givenByUserId: string,
    manager?: EntityManager,
  ): Promise<DeleteResult> {
    return (manager ?? getManager()).delete(PendingLeaderboardContent, {
      channelId,
      emojiId,
      givenByUserId,
      messageId,
      reactionId: Not(IsNull()),
      teamId,
    });
  }

  static commitAwards(
    msgId: string,
    teamId: string,
    channelId: string,
    reactionId: string | undefined,
  ): Promise<void> {
    return getManager().transaction(
      async (manager: EntityManager): Promise<void> => {
        const queryParams = [teamId, msgId, channelId];
        let reactionIdQuery = 'AND reactionId IS NULL';
        if (reactionId !== undefined) {
          queryParams.push(reactionId);
          reactionIdQuery = 'AND reactionId = ?';
        }
        await manager.query(
          `INSERT INTO allowed_emoji (id, teamId, createdAt, deletedAt) SELECT \
          emojiId AS id, teamId, datetime("now"), NULL from pending_leaderboard_content \
          WHERE teamId = ? AND messageId = ? AND channelId = ? AND deletedAt IS NULL ${reactionIdQuery} GROUP BY emojiId \
          ON CONFLICT (id, teamId) DO UPDATE SET deletedAt = NULL`,
          queryParams,
        );
        await manager.query(
          `INSERT INTO leaderboard SELECT * from pending_leaderboard_content WHERE \
          teamId = ? AND messageId = ? AND channelId = ? AND deletedAt IS NULL ${reactionIdQuery}`,
          queryParams,
        );
        await PendingLeaderboardContent.deleteAwards(
          msgId,
          teamId,
          channelId,
          reactionId,
          manager,
        );
        AllowedEmoji.clearCacheForTeam(teamId);
      },
    );
  }

  static async insertPendingContent(
    data: InsertLeaderboardData[],
    messageIdToDelete: string | null,
    teamId: string,
    channelId: string,
    manager: EntityManager,
  ): Promise<unknown> {
    if (messageIdToDelete) {
      await PendingLeaderboardContent.deleteAwards(
        messageIdToDelete,
        teamId,
        channelId,
        undefined,
        manager,
      );
    }
    return manager
      .createQueryBuilder()
      .insert()
      .into(PendingLeaderboardContent)
      .values(data)
      .updateEntity(false)
      .execute();
  }
}
