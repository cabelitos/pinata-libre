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
  tacoCount: string;
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

  static deleteTacos(
    tacosToDelete: string,
    teamId: string,
    manager?: EntityManager,
  ): Promise<unknown> {
    return (manager ?? getManager()).softDelete(Leaderboard, {
      messageId: tacosToDelete,
      teamId,
    });
  }

  static async addTacos(
    people: InsertLeaderboardData[],
    tacosToDelete: string | null,
    teamId: string,
  ): Promise<void> {
    return getManager().transaction(
      async (manager: EntityManager): Promise<void> => {
        if (tacosToDelete) {
          await Leaderboard.deleteTacos(tacosToDelete, teamId, manager);
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
      .select('count(*) as "tacoCount", lb.userId')
      .where('lb.teamId = :teamId ', { teamId })
      .groupBy('lb.userId')
      .orderBy('"tacoCount"', 'DESC')
      .limit(limit)
      .execute();
    return data ?? [];
  }
}
