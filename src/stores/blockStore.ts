import { defineStore } from 'pinia';

import { blockApi } from '@/api/blockApi';
import { exchangeApi } from '@/api/exchangeApi';
import { FORM_MESSAGES, PAGE_MESSAGES } from '@/constants/messages';
import { buildBlockPairKey, otherUserIdOf, type BlockRelation } from '@/models/block';
import { useExchangeStore } from '@/stores/exchangeStore';
import { message } from '@/utils/message';

export const useBlockStore = defineStore('blocks', {
  state: () => ({
    blocks: [] as BlockRelation[],
    hydrated: false,
    loading: false,
    /** 进行中的 pair_key，防止重复点击/两个标签页同时提交产生重复关系 */
    mutating: [] as string[],
  }),
  getters: {
    /** 方向性判断：blockerId 是否拉黑了 blockedId */
    isBlockedBy: (state) => (blockerId: string, blockedId: string) => {
      const relation = state.blocks.find((item) => item.pair_key === buildBlockPairKey(blockerId, blockedId));
      return Boolean(relation?.blocker_ids.includes(blockerId));
    },
    /** 我主动拉黑的用户 id 列表，用于个人中心黑名单展示 */
    blockedUserIds: (state) => (userId: string) =>
      state.blocks
        .filter((item) => item.blocker_ids.includes(userId))
        .map((item) => otherUserIdOf(item, userId)),
    isMutating: (state) => (userA: string, userB: string) => state.mutating.includes(buildBlockPairKey(userA, userB)),
  },
  actions: {
    async hydrate() {
      this.loading = true;
      try {
        this.blocks = await blockApi.list();
        this.hydrated = true;
      } finally {
        this.loading = false;
      }
    },
    async block(blockerId: string, blockedId: string) {
      if (blockerId === blockedId) {
        message(FORM_MESSAGES.blockSelf, 'error');
        return;
      }
      if (this.isBlockedBy(blockerId, blockedId)) {
        message(PAGE_MESSAGES.blockedAgain, 'info');
        return;
      }
      const pairKey = buildBlockPairKey(blockerId, blockedId);
      if (this.mutating.includes(pairKey)) return;
      this.mutating.push(pairKey);
      try {
        await blockApi.block(blockerId, blockedId);
        await exchangeApi.closePendingBetween(blockerId, blockedId);
        this.blocks = await blockApi.list();
        const exchangeStore = useExchangeStore();
        await exchangeStore.hydrate();
        message(PAGE_MESSAGES.blocked, 'success');
      } finally {
        this.mutating = this.mutating.filter((key) => key !== pairKey);
      }
    },
    async unblock(blockerId: string, blockedId: string) {
      const pairKey = buildBlockPairKey(blockerId, blockedId);
      if (this.mutating.includes(pairKey)) return;
      this.mutating.push(pairKey);
      try {
        // 只解除关系，历史交换记录（含已关闭的旧请求）保持原样，不恢复
        await blockApi.unblock(blockerId, blockedId);
        this.blocks = await blockApi.list();
        message(PAGE_MESSAGES.unblocked, 'success');
      } finally {
        this.mutating = this.mutating.filter((key) => key !== pairKey);
      }
    },
  },
});
