import {
  BaseEntity,
  CreateDateColumn,
  DeleteResult,
  Entity,
  getManager,
  InsertResult,
  PrimaryColumn,
} from 'typeorm';

@Entity()
export default class DoNotAskForAddEmojis extends BaseEntity {
  @PrimaryColumn()
  teamId: string;

  @PrimaryColumn()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  public static addDoNotAskForEmojis(
    teamId: string,
    userId: string,
  ): Promise<InsertResult> {
    return getManager()
      .createQueryBuilder()
      .insert()
      .into(DoNotAskForAddEmojis)
      .values({ teamId, userId })
      .updateEntity(false)
      .execute();
  }

  public static deleteDoNotAskForEmojis(
    teamId: string,
    userId: string,
  ): Promise<DeleteResult> {
    return getManager().delete(DoNotAskForAddEmojis, {
      teamId,
      userId,
    });
  }
}
