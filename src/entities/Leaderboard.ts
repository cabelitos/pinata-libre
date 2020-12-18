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
  userId: string;
  messageId: string;
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

  static deleteTacos(
    tacosToDelete: string,
    manager?: EntityManager,
  ): Promise<unknown> {
    return (manager ?? getManager()).softDelete(Leaderboard, {
      messageId: tacosToDelete,
    });
  }

  static async addTacos(
    people: InsertLeaderboardData[],
    tacosToDelete: string | null,
  ): Promise<void> {
    return getManager().transaction(
      async (manager: EntityManager): Promise<void> => {
        if (tacosToDelete) {
          await Leaderboard.deleteTacos(tacosToDelete, manager);
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

  static async getLeaderboard(limit: number): Promise<LeaderboardData[]> {
    const data = await getManager()
      .createQueryBuilder(Leaderboard, 'lb')
      .select('count(*) as "tacoCount", lb.userId')
      .groupBy('lb.userId')
      .orderBy('"tacoCount"', 'DESC')
      .limit(limit)
      .execute();
    return data ?? [];
  }
}
