import {
  BaseEntity,
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  DeleteDateColumn,
  getManager,
  EntityManager,
  Index,
} from 'typeorm';

export interface LeaderboardData {
  awardCount: string;
  userId: string;
}

export interface InsertLeaderboardData {
  emoji: string;
  messageId: string;
  teamId: string;
  userId: string;
}
@Entity()
export default class Leaderboard extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;

  @Column()
  messageId: string;

  @Column()
  @Index()
  teamId: string;

  @Column()
  emoji: string;

  static deleteAwards(
    messageIdToDelete: string,
    teamId: string,
    manager?: EntityManager,
  ): Promise<unknown> {
    return (manager ?? getManager()).softDelete(Leaderboard, {
      messageId: messageIdToDelete,
      teamId,
    });
  }

  static async addAwards(
    people: InsertLeaderboardData[],
    messageIdToDelete: string | null,
    teamId: string,
  ): Promise<void> {
    return getManager().transaction(
      async (manager: EntityManager): Promise<void> => {
        if (messageIdToDelete) {
          await Leaderboard.deleteAwards(messageIdToDelete, teamId, manager);
        }
        await manager
          .createQueryBuilder()
          .insert()
          .into(Leaderboard)
          .values(people)
          .execute();
      },
    );
  }

  static async getLeaderboard(
    limit: number,
    teamId: string,
  ): Promise<LeaderboardData[]> {
    const data = await getManager()
      .createQueryBuilder(Leaderboard, 'lb')
      .select('count(*) as "awardCount", lb.userId')
      .where('lb.teamId = :teamId ', { teamId })
      .groupBy('lb.userId')
      .orderBy('"awardCount"', 'DESC')
      .limit(limit)
      .execute();
    return data ?? [];
  }
}
