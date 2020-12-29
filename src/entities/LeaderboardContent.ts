import {
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  DeleteDateColumn,
  Index,
  BaseEntity,
} from 'typeorm';

export interface InsertLeaderboardData {
  emojiId: string;
  messageId: string;
  teamId: string;
  userId: string;
  givenByUserId: string;
  channelId: string;
  reactionId: string | null;
}

export default abstract class LeaderboardContent extends BaseEntity {
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

  @Column()
  @Index()
  givenByUserId: string;

  @Column({ default: 'unknown', type: 'varchar' })
  channelId: string;

  @Column({ nullable: true, type: 'varchar' })
  reactionId: string | null;
}
