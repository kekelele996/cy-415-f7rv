export interface BlockRelation {
  id: string;
  /** 两个用户 id 排序后拼接的规范化 key，保证双方互拉也只留一条关系 */
  pair_key: string;
  /** 主动发起拉黑的用户 id；双方互拉时包含两个 id，但仍共用一条记录 */
  blocker_ids: string[];
  created_at: string;
  updated_at: string;
}

export const buildBlockPairKey = (userA: string, userB: string) => [userA, userB].sort().join('::');

export const otherUserIdOf = (relation: BlockRelation, userId: string) =>
  relation.pair_key.split('::').find((id) => id !== userId) ?? '';
