import { buildBlockPairKey, type BlockRelation } from '@/models/block';
import { storage, STORAGE_KEYS } from '@/utils/storage';

/** 同一对用户只保留一条关系；历史脏数据按 pair_key 合并，blocker_ids 取并集 */
const dedupeByPair = (relations: BlockRelation[]): BlockRelation[] => {
  const map = new Map<string, BlockRelation>();
  for (const relation of relations) {
    const existing = map.get(relation.pair_key);
    if (existing) {
      map.set(relation.pair_key, {
        ...existing,
        blocker_ids: [...new Set([...existing.blocker_ids, ...relation.blocker_ids])],
      });
    } else {
      map.set(relation.pair_key, relation);
    }
  }
  return [...map.values()];
};

export const blockApi = {
  async list(): Promise<BlockRelation[]> {
    const relations = await storage.get<BlockRelation[]>(STORAGE_KEYS.blocks, []);
    return dedupeByPair(relations);
  },

  /**
   * 幂等：重复拉黑或两个标签页同时提交，最终都只合并进同一条 pair 记录。
   * 写后回读校验：并发写入互相覆盖时重试合并，保证自己的拉黑标记不丢失。
   */
  async block(blockerId: string, blockedId: string): Promise<BlockRelation> {
    const pairKey = buildBlockPairKey(blockerId, blockedId);
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const relations = await this.list();
      const existing = relations.find((item) => item.pair_key === pairKey);
      const now = new Date().toISOString();
      const next: BlockRelation = existing
        ? { ...existing, blocker_ids: [...new Set([...existing.blocker_ids, blockerId])], updated_at: now }
        : {
            id: storage.createId('block'),
            pair_key: pairKey,
            blocker_ids: [blockerId],
            created_at: now,
            updated_at: now,
          };
      await storage.set(STORAGE_KEYS.blocks, [next, ...relations.filter((item) => item.pair_key !== pairKey)]);
      const saved = (await this.list()).find((item) => item.pair_key === pairKey);
      if (saved?.blocker_ids.includes(blockerId)) return saved;
    }
    const relations = await this.list();
    const fallback = relations.find((item) => item.pair_key === pairKey);
    if (!fallback) throw new Error('拉黑失败，请重试');
    return fallback;
  },

  /** 只移除自己的拉黑标记；双方都解除后记录才删除。历史交换记录不做任何改动 */
  async unblock(blockerId: string, blockedId: string): Promise<void> {
    const relations = await this.list();
    const pairKey = buildBlockPairKey(blockerId, blockedId);
    const existing = relations.find((item) => item.pair_key === pairKey);
    if (!existing || !existing.blocker_ids.includes(blockerId)) return;
    const next = relations
      .map((item) =>
        item.pair_key === pairKey
          ? { ...item, blocker_ids: item.blocker_ids.filter((id) => id !== blockerId), updated_at: new Date().toISOString() }
          : item,
      )
      .filter((item) => item.blocker_ids.length > 0);
    await storage.set(STORAGE_KEYS.blocks, next);
  },

  /** 方向性判断：blockerId 是否拉黑了 blockedId（被拉黑者不能对拉黑者的物品发起请求） */
  async isBlockedBy(blockerId: string, blockedId: string): Promise<boolean> {
    const relations = await this.list();
    const relation = relations.find((item) => item.pair_key === buildBlockPairKey(blockerId, blockedId));
    return Boolean(relation?.blocker_ids.includes(blockerId));
  },
};
