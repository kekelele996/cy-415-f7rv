import { defineStore } from 'pinia';

import { blacklistApi } from '@/api/blacklistApi';
import { BLACKLIST_MESSAGES } from '@/constants/messages';
import { buildBlockPairKey, type BlockRelation } from '@/models/blacklist';
import { useAuthStore } from '@/stores/authStore';
import { useExchangeStore } from '@/stores/exchangeStore';
import { message } from '@/utils/message';

export const useBlacklistStore = defineStore('blacklist', {
  state: () => ({
    relations: [] as BlockRelation[],
    hydrated: false,
    loading: false,
    acting: false,
  }),
  getters: {
    isBlockedBetween: (state) => (userA: string, userB: string) => {
      if (!userA || !userB) return false;
      const pairKey = buildBlockPairKey(userA, userB);
      return state.relations.some((relation) => relation.pair_key === pairKey);
    },
    relationsOf: (state) => (userId: string) =>
      state.relations.filter(
        (relation) => relation.blocker_id === userId || relation.blocked_id === userId,
      ),
  },
  actions: {
    async hydrate() {
      this.loading = true;
      try {
        this.relations = await blacklistApi.list();
        this.hydrated = true;
      } finally {
        this.loading = false;
      }
    },
    async block(targetUserId: string) {
      const authStore = useAuthStore();
      const me = authStore.currentUser;
      if (!me || !targetUserId) return;
      if (targetUserId === me.id) {
        message(BLACKLIST_MESSAGES.selfBlock, 'error');
        return;
      }
      // 重复点击、两个标签页同时提交：acting 挡一次，api 层 pair_key 幂等再挡一次
      if (this.acting) return;
      if (this.isBlockedBetween(me.id, targetUserId)) {
        message(BLACKLIST_MESSAGES.alreadyBlocked, 'info');
        return;
      }
      this.acting = true;
      try {
        await blacklistApi.block(me.id, targetUserId);
        const exchangeStore = useExchangeStore();
        const closed = await exchangeStore.closePendingBetween(me.id, targetUserId);
        this.relations = await blacklistApi.list();
        message(
          closed > 0 ? BLACKLIST_MESSAGES.closedPending(closed) : BLACKLIST_MESSAGES.blocked,
          'success',
        );
      } finally {
        this.acting = false;
      }
    },
    async unblock(targetUserId: string) {
      const authStore = useAuthStore();
      const me = authStore.currentUser;
      if (!me || !targetUserId || this.acting) return;
      this.acting = true;
      try {
        // 只移除关系：历史交换记录保持原样，已关闭的旧请求不会恢复
        await blacklistApi.unblock(me.id, targetUserId);
        this.relations = await blacklistApi.list();
        message(BLACKLIST_MESSAGES.unblocked, 'success');
      } finally {
        this.acting = false;
      }
    },
  },
});
