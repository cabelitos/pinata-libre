import {
  BaseEntity,
  Entity,
  Column,
  PrimaryColumn,
  getRepository,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import type { Installation } from '@slack/oauth';

@Entity()
export default class SlackInstallation extends BaseEntity {
  @PrimaryColumn()
  id: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column('simple-json')
  installation: Installation;

  @UpdateDateColumn()
  updatedAt: Date;

  static createInstallation(
    teamId: string,
    installation: Installation,
  ): Promise<unknown> {
    const repo = getRepository(SlackInstallation);
    const slackInstall = new SlackInstallation();
    repo.merge(slackInstall, { id: teamId, installation });
    return repo.save(slackInstall);
  }

  static async getInstallation(teamId: string): Promise<Installation> {
    const { installation } = await getRepository(
      SlackInstallation,
    ).findOneOrFail({
      select: ['installation'],
      where: {
        id: teamId,
      },
    });
    return installation;
  }
}
