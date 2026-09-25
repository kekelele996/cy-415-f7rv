import { ExchangeStatus } from './exchange';
import { ItemStatus } from './item';

export const PAGE_MESSAGES = {
  homeEmpty: '暂时没有符合条件的闲置物品',
  publishReady: '发布后会同步写入 localStorage 和 IndexedDB',
  exchangeEmpty: '还没有交换请求，先去首页挑一件合眼缘的物品',
  profileUpdated: '个人资料已更新',
  blacklistHint: '拉黑后对方无法对你发布的可交换物品发起交换，已有待确认请求会立即关闭且双方物品状态不变',
  blocked: '已拉黑，双方待确认的交换请求已关闭',
  blockedAgain: '对方已在黑名单中，无需重复操作',
  unblocked: '已解除拉黑，历史交换记录保持不变',
  exchangeBlockedHint: '对方已将你加入黑名单，无法对这件物品发起交换',
};

export const FORM_MESSAGES = {
  requiredTitle: '物品标题不能为空',
  requiredDescription: '请描述你希望交换的物品',
  requiredPhone: '请填写联系方式',
  imageLimit: '最多上传 4 张图片',
  exchangeNeedOwnItem: '请先发布一件可交换物品',
  exchangeBlocked: '对方已将你拉黑，无法发起交换',
  blockSelf: '不能拉黑自己',
};

export const LOG_MESSAGES = {
  storageHydrated: 'storage hydrated with status maps',
  itemStatusUsed: `ItemStatus includes ${ItemStatus.AVAILABLE}, ${ItemStatus.EXCHANGED}, ${ItemStatus.OFFLINE}`,
  exchangeStatusUsed: `ExchangeStatus includes ${ExchangeStatus.PENDING}, ${ExchangeStatus.ACCEPTED}, ${ExchangeStatus.REJECTED}, ${ExchangeStatus.COMPLETED}, ${ExchangeStatus.CANCELLED}`,
};

export const STATUS_MESSAGE_MAP = {
  [ItemStatus.AVAILABLE]: '这件物品可发起交换',
  [ItemStatus.EXCHANGED]: '这件物品已完成交换',
  [ItemStatus.OFFLINE]: '这件物品已下架',
  [ExchangeStatus.PENDING]: '等待对方确认',
  [ExchangeStatus.ACCEPTED]: '交换已同意，可确认完成',
  [ExchangeStatus.REJECTED]: '交换请求已拒绝',
  [ExchangeStatus.COMPLETED]: '交换流程已完成',
  [ExchangeStatus.CANCELLED]: '交换请求已关闭',
};
