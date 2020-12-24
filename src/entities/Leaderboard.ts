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
  JoinColumn,
  ManyToOne,
} from 'typeorm';

import AllowedEmoji from './AllowedEmoji';

export interface LeaderboardData {
  awardCount: string;
  userId: string;
  emojiId: string;
}

export interface InsertLeaderboardData {
  emojiId: string;
  messageId: string;
  teamId: string;
  userId: string;
  givenByUserId: string;
}

const getLeaderboardLimit = (): number => {
  const limit = parseInt(process.env.LEADERBOARD_LIMIT ?? '10', 10) ?? 10;
  return Number.isNaN(limit) ? 10 : limit;
};

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
  emojiId: string;

  @ManyToOne('AllowedEmoji')
  @JoinColumn([
    { name: 'emojiId', referencedColumnName: 'id' },
    { name: 'teamId', referencedColumnName: 'teamId' },
  ])
  emoji: AllowedEmoji;

  @Column()
  @Index()
  givenByUserId: string;

  public static readonly leaderboardLimit = getLeaderboardLimit();

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
