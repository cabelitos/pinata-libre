import {
  BaseEntity,
  Entity,
  PrimaryColumn,
  getManager,
  DeleteDateColumn,
  CreateDateColumn,
  EntityManager,
} from 'typeorm';
import LRUCache from 'lru-cache';

@Entity()
export default class AllowedEmoji extends BaseEntity {
  @PrimaryColumn()
  id: string;

  @DeleteDateColumn()
  deletedAt: Date | null;

  @PrimaryColumn()
  teamId: string;

  @CreateDateColumn()
  createdAt: Date;

  private static allowedEmojiCache = new LRUCache<string, Set<string>>(100);

  static async makeAllowedEmojis(
    emojis: string[],
    teamId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = (manager ?? getManager()).getRepository(AllowedEmoji);
    await repo.save(
      emojis.map(emoji => ({ deletedAt: null, id: emoji, teamId })),
    );
    AllowedEmoji.clearCacheForTeam(teamId);
  }

  static clearCacheForTeam(teamId: string): void {
    AllowedEmoji.allowedEmojiCache.del(teamId);
  }

  static async getAllowedEmojisByTeam(teamId: string): Promise<Set<string>> {
    const cacheHit = AllowedEmoji.allowedEmojiCache.get(teamId);
    if (cacheHit) return cacheHit;
    const allowedEmojis = await getManager().find(AllowedEmoji, {
      select: ['id'],
      where: {
        teamId,
      },
    });
    let emojiSet = new Set<string>();
    if (allowedEmojis) {
      emojiSet = allowedEmojis.reduce((acc, { id }): Set<string> => {
        acc.add(id);
        return acc;
      }, emojiSet);
    }
    AllowedEmoji.allowedEmojiCache.set(teamId, emojiSet);
    return emojiSet;
  }
}
