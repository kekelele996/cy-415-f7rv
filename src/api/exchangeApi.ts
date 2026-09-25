import { EXCHANGE_ACTION_FLOW, ExchangeStatus } from '@/constants/exchange';
import { ItemStatus } from '@/constants/item';
import { BLACKLIST_MESSAGES } from '@/constants/messages';
import type { Exchange, ExchangeDraft } from '@/models/exchange';

import { blacklistApi } from './blacklistApi';
import { itemApi } from './itemApi';
import { storage, STORAGE_KEYS } from '@/utils/storage';

const seedExchanges: Exchange[] = [
  {
    id: 'exchange_seed',
    from_user_id: 'user_me',
    to_user_id: 'user_lin',
    from_item_id: 'item_chair',
    to_item_id: 'item_camera',
    status: ExchangeStatus.PENDING,
    message: '露营椅换拍立得，可以同城当面交换。',
    created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
];

export const exchangeApi = {
  async list(): Promise<Exchange[]> {
    const exchanges = await storage.get<Exchange[]>(STORAGE_KEYS.exchanges, []);
    if (exchanges.length) return exchanges;
    await storage.set(STORAGE_KEYS.exchanges, seedExchanges);
    return seedExchanges;
  },

  async create(draft: ExchangeDraft): Promise<Exchange> {
    const exchanges = await this.list();
    if (await blacklistApi.isBlockedBetween(draft.from_user_id, draft.to_user_id)) {
      throw new Error(BLACKLIST_MESSAGES.exchangeBlocked);
    }
    const targetItem = await itemApi.detail(draft.to_item_id);
    if (!targetItem || targetItem.status !== ItemStatus.AVAILABLE) {
      throw new Error('目标物品当前不可交换');
    }
    const nextExchange: Exchange = {
      ...draft,
      id: storage.createId('exchange'),
      status: draft.status ?? ExchangeStatus.PENDING,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await storage.set(STORAGE_KEYS.exchanges, [nextExchange, ...exchanges]);
    return nextExchange;
  },

  async transition(id: string, status: ExchangeStatus): Promise<Exchange> {
    const exchanges = await this.list();
    const current = exchanges.find((item) => item.id === id);
    if (!current) throw new Error('交换请求不存在');
    if (!EXCHANGE_ACTION_FLOW[current.status].includes(status)) {
      throw new Error('当前状态不允许该操作');
    }
    const nextExchange: Exchange = { ...current, status, updated_at: new Date().toISOString() };
    if (status === ExchangeStatus.COMPLETED) {
      await itemApi.setStatus(current.from_item_id, ItemStatus.EXCHANGED);
      await itemApi.setStatus(current.to_item_id, ItemStatus.EXCHANGED);
    }
    await storage.set(
      STORAGE_KEYS.exchanges,
      exchanges.map((item) => (item.id === id ? nextExchange : item)),
    );
    return nextExchange;
  },

  /**
   * 拉黑时调用：把两人之间（两个方向）所有待确认请求直接关闭为已拒绝。
   * 只改交换状态，不触碰双方物品状态；已同意/已完成的记录保持原样。
   */
  async closePendingBetween(userA: string, userB: string): Promise<number> {
    const exchanges = await this.list();
    const nowIso = new Date().toISOString();
    let closed = 0;
    const nextExchanges = exchanges.map((exchange) => {
      const involvesPair =
        (exchange.from_user_id === userA && exchange.to_user_id === userB) ||
        (exchange.from_user_id === userB && exchange.to_user_id === userA);
      if (exchange.status === ExchangeStatus.PENDING && involvesPair) {
        closed += 1;
        return { ...exchange, status: ExchangeStatus.REJECTED, updated_at: nowIso };
      }
      return exchange;
    });
    if (closed > 0) {
      await storage.set(STORAGE_KEYS.exchanges, nextExchanges);
    }
    return closed;
  },
};
