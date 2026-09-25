import { buildBlockPairKey, type BlockRelation } from '@/models/blacklist';
import { storage, STORAGE_KEYS } from '@/utils/storage';

const dedupeRelations = (relations: BlockRelation[]): BlockRelation[] => {
  const seen = new Set<string>();
  return relations.filter((relation) => {
    if (seen.has(relation.pair_key)) return false;
    seen.add(relation.pair_key);
    return true;
  });
};

export const blacklistApi = {
  async list(): Promise<BlockRelation[]> {
    const relations = await storage.get<BlockRelation[]>(STORAGE_KEYS.blacklist, []);
    return dedupeRelations(relations);
  },

  async isBlockedBetween(userA: string, userB: string): Promise<boolean> {
    const pairKey = buildBlockPairKey(userA, userB);
    const relations = await this.list();
    return relations.some((relation) => relation.pair_key === pairKey);
  },

  async block(blockerId: string, blockedId: string): Promise<BlockRelation> {
    const relations = await this.list();
    const pairKey = buildBlockPairKey(blockerId, blockedId);
    const existing = relations.find((relation) => relation.pair_key === pairKey);
    if (existing) return existing;
    const relation: BlockRelation = {
      // 确定性 id：两个标签页同时提交会写出同一条记录，后写覆盖先写，仍然只有一条
      id: `block_${pairKey}`,
      pair_key: pairKey,
      blocker_id: blockerId,
      blocked_id: blockedId,
      created_at: new Date().toISOString(),
    };
    await storage.set(STORAGE_KEYS.blacklist, [relation, ...relations]);
    return relation;
  },

  async unblock(userA: string, userB: string): Promise<void> {
    const relations = await this.list();
    const pairKey = buildBlockPairKey(userA, userB);
    const nextRelations = relations.filter((relation) => relation.pair_key !== pairKey);
    if (nextRelations.length === relations.length) return;
    await storage.set(STORAGE_KEYS.blacklist, nextRelations);
  },
};
