<template>
  <section v-if="currentUser" class="page profile-page">
    <div class="page-heading">
      <div>
        <p class="eyebrow">个人中心</p>
        <h1>资料越完整，交换越容易达成</h1>
      </div>
    </div>

    <div class="profile-layout">
      <form class="profile-form" @submit.prevent="save">
        <label>
          本地模拟登录
          <select v-model="selectedUserId" @change="switchUser">
            <option v-for="user in users" :key="user.id" :value="user.id">
              {{ user.nickname }} · {{ user.location }}
            </option>
          </select>
        </label>
        <AvatarUploader v-model="form.avatar" />
        <label>
          昵称
          <input v-model="form.nickname" />
        </label>
        <label>
          电话
          <input v-model="form.phone" />
        </label>
        <label>
          常用地点
          <input v-model="form.location" />
        </label>
        <button class="primary-button" type="submit">保存资料</button>
      </form>

      <div class="profile-side">
        <UserBrief :user="{ ...currentUser, ...form }" />
        <div class="stats-row">
          <span>发布 {{ myItems.length }}</span>
          <span>可交换 {{ availableCount }}</span>
          <span>信用 {{ currentUser.credit_score }}</span>
        </div>
      </div>
    </div>

    <section class="my-items">
      <h2>我发布的物品</h2>
      <div v-if="myItems.length" class="waterfall waterfall--compact">
        <ItemCard
          v-for="item in myItems"
          :key="item.id"
          :item="item"
          :owner="currentUser"
        />
      </div>
      <EmptyState v-else title="还没有发布物品" description="发布一件闲置后会出现在这里" mark="物" />
    </section>

    <section class="blacklist-panel">
      <h2>黑名单</h2>
      <p class="form-note">{{ BLACKLIST_MESSAGES.profileHint }}</p>
      <div class="blacklist-add">
        <select v-model="blockCandidateId">
          <option value="">选择要拉黑的用户</option>
          <option v-for="user in blockCandidates" :key="user.id" :value="user.id">
            {{ user.nickname }} · {{ user.location }}
          </option>
        </select>
        <button
          class="secondary-button"
          type="button"
          :disabled="!blockCandidateId || blacklistStore.acting"
          @click="blockUser"
        >
          拉黑
        </button>
      </div>
      <ul v-if="blockedEntries.length" class="blacklist-list">
        <li v-for="entry in blockedEntries" :key="entry.relation.id">
          <div>
            <strong>{{ entry.other?.nickname ?? '未知用户' }}</strong>
            <small>{{ formatDate(entry.relation.created_at) }} 拉黑</small>
          </div>
          <button type="button" :disabled="blacklistStore.acting" @click="blacklistStore.unblock(entry.otherId)">
            解除
          </button>
        </li>
      </ul>
      <p v-else class="form-note">黑名单为空。被拉黑的用户会出现在这里，可随时解除。</p>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, watchEffect } from 'vue';

import AvatarUploader from '@/components/common/AvatarUploader.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import ItemCard from '@/components/common/ItemCard.vue';
import UserBrief from '@/components/common/UserBrief.vue';
import { ItemStatus } from '@/constants/item';
import { BLACKLIST_MESSAGES } from '@/constants/messages';
import { useAuth } from '@/hooks/useAuth';
import { useBlacklistStore } from '@/stores/blacklistStore';
import { useItemStore } from '@/stores/itemStore';
import { formatDate } from '@/utils/formatters';

const { currentUser, users, login, updateProfile } = useAuth();
const itemStore = useItemStore();
const blacklistStore = useBlacklistStore();
const selectedUserId = ref('');
const blockCandidateId = ref('');

const form = reactive({
  nickname: '',
  avatar: '',
  phone: '',
  location: '',
});

watchEffect(() => {
  if (currentUser.value) {
    selectedUserId.value = currentUser.value.id;
    form.nickname = currentUser.value.nickname;
    form.avatar = currentUser.value.avatar;
    form.phone = currentUser.value.phone;
    form.location = currentUser.value.location;
  }
});

watch(
  () => users.value.length,
  () => {
    if (!selectedUserId.value && currentUser.value) {
      selectedUserId.value = currentUser.value.id;
    }
  },
);

const myItems = computed(() => (currentUser.value ? itemStore.myItems(currentUser.value.id) : []));
const availableCount = computed(() => myItems.value.filter((item) => item.status === ItemStatus.AVAILABLE).length);

const blockedEntries = computed(() => {
  if (!currentUser.value) return [];
  const myId = currentUser.value.id;
  return blacklistStore.relationsOf(myId).map((relation) => {
    const otherId = relation.blocker_id === myId ? relation.blocked_id : relation.blocker_id;
    return {
      relation,
      otherId,
      other: users.value.find((user) => user.id === otherId),
    };
  });
});

const blockCandidates = computed(() => {
  if (!currentUser.value) return [];
  const myId = currentUser.value.id;
  return users.value.filter(
    (user) => user.id !== myId && !blacklistStore.isBlockedBetween(myId, user.id),
  );
});

const blockUser = async () => {
  if (!blockCandidateId.value) return;
  await blacklistStore.block(blockCandidateId.value);
  blockCandidateId.value = '';
};

const save = async () => {
  await updateProfile({ ...form });
};

const switchUser = async () => {
  if (selectedUserId.value) {
    await login(selectedUserId.value);
  }
};
</script>
