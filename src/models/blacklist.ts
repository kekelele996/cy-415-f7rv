export interface BlockRelation {
  id: string;
  pair_key: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

/**
 * 黑名单关系按“无序用户对”唯一：无论谁先拉黑，pair_key 都相同。
 * 双方互拉、重复拉黑、两个标签页同时提交，最终都只会落到同一条记录上。
 */
export const buildBlockPairKey = (userA: string, userB: string) => [userA, userB].sort().join('__');
