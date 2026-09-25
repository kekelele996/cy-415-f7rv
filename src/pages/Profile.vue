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

    <section class="blacklist-panel">
      <div class="blacklist-panel__heading">
        <h2>黑名单</h2>
        <p class="form-note">{{ PAGE_MESSAGES.blacklistHint }}</p>
      </div>
      <div v-if="otherUsers.length" class="blacklist-list">
        <div v-for="user in otherUsers" :key="user.id" class="blacklist-row">
          <UserBrief :user="user" />
          <div class="blacklist-row__action">
            <span v-if="hasBlocked(user.id)" class="status-pill status-muted">已拉黑</span>
            <button
              v-if="hasBlocked(user.id)"
              class="secondary-button"
              type="button"
              :disabled="isMutating(user.id)"
              @click="unblock(user.id)"
            >
              解除拉黑
            </button>
            <button
              v-else
              class="secondary-button"
              type="button"
              :disabled="isMutating(user.id)"
              @click="block(user.id)"
            >
              拉黑
            </button>
          </div>
        </div>
      </div>
      <EmptyState v-else title="暂无其他用户" description="本地演示数据只有当前账号" mark="黑" />
    </section>

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
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, watchEffect } from 'vue';

import AvatarUploader from '@/components/common/AvatarUploader.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import ItemCard from '@/components/common/ItemCard.vue';
import UserBrief from '@/components/common/UserBrief.vue';
import { ItemStatus } from '@/constants/item';
import { PAGE_MESSAGES } from '@/constants/messages';
import { useAuth } from '@/hooks/useAuth';
import { useBlockStore } from '@/stores/blockStore';
import { useItemStore } from '@/stores/itemStore';

const { currentUser, users, login, updateProfile } = useAuth();
const itemStore = useItemStore();
const blockStore = useBlockStore();
const selectedUserId = ref('');

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
const otherUsers = computed(() => users.value.filter((user) => user.id !== currentUser.value?.id));

const hasBlocked = (userId: string) =>
  currentUser.value ? blockStore.isBlockedBy(currentUser.value.id, userId) : false;
const isMutating = (userId: string) =>
  currentUser.value ? blockStore.isMutating(currentUser.value.id, userId) : false;

const block = async (userId: string) => {
  if (!currentUser.value) return;
  await blockStore.block(currentUser.value.id, userId);
};

const unblock = async (userId: string) => {
  if (!currentUser.value) return;
  await blockStore.unblock(currentUser.value.id, userId);
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
