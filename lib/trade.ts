import { AShareOrder, HKShareOrder, IPOOrder, BlockOrder, BoardOrder, TradeConfig } from '@/types/trade';

// 获取交易配置
export const getTradeConfig = (): TradeConfig => ({
  a_share: {
    commission_rate: 0.0003,
    stamp_duty_rate: 0.001,
    transfer_fee_rate: 0.00002,
    min_commission: 5,
  },
  hk_share: {
    commission_rate: 0.0003,
    min_commission_hkd: 50,
    exchange_rate_buffer: 0.02,
  },
  ipo: {
    max_apply_amount: 1000000,
    qualification_days: 20,
  },
  block: {
    min_amount: 2000000,
    max_discount_rate: 0.1,
  },
  board: {
    daily_user_quota: 100000,
    risk_amount_threshold: 50000,
    manual_approval_threshold: 100000,
  },
});

// 1. A股交易计算
export const calculateAShare = (price: number, quantity: number, side: 'buy' | 'sell') => {
  const config = getTradeConfig().a_share;
  const amount = price * quantity;
  
  let commission = amount * config.commission_rate;
  commission = Math.max(commission, config.min_commission);
  
  const stampDuty = side === 'sell' ? amount * config.stamp_duty_rate : 0;
  const transferFee = amount * config.transfer_fee_rate;
  
  const totalFee = commission + stampDuty + transferFee;
  const totalAmount = side === 'buy' ? amount + totalFee : amount - totalFee;
  
  return { amount, commission, stampDuty, transferFee, totalFee, totalAmount };
};

// 2. 港股交易计算（含汇率）
export const calculateHKShare = (priceHKD: number, quantity: number, exchangeRate: number, side: 'buy' | 'sell') => {
  const config = getTradeConfig().hk_share;
  const amountHKD = priceHKD * quantity;
  const amountCNY = amountHKD * exchangeRate;
  
  let commissionHKD = amountHKD * config.commission_rate;
  commissionHKD = Math.max(commissionHKD, config.min_commission_hkd);
  
  const commissionCNY = commissionHKD * exchangeRate;
  const totalAmountHKD = side === 'buy' ? amountHKD + commissionHKD : amountHKD - commissionHKD;
  const totalAmountCNY = totalAmountHKD * exchangeRate;
  
  return { amountHKD, amountCNY, commissionHKD, commissionCNY, totalAmountHKD, totalAmountCNY };
};

// 3. 新股申购资格审核
export const checkIPOQualification = (userTradeDays: number, userBalance: number, applyAmount: number) => {
  const config = getTradeConfig().ipo;
  
  if (userTradeDays < config.qualification_days) {
    return { qualified: false, reason: `交易天数不足${config.qualification_days}天` };
  }
  
  if (userBalance < applyAmount) {
    return { qualified: false, reason: '账户余额不足' };
  }
  
  if (applyAmount > config.max_apply_amount) {
    return { qualified: false, reason: `申购金额超过限额${config.max_apply_amount}元` };
  }
  
  return { qualified: true };
};

// 4. 大宗交易匹配
export const matchBlockTrade = (order: Partial<BlockOrder>, minQuantity: number) => {
  const config = getTradeConfig().block;
  const amount = (order.price || 0) * (order.quantity || 0);
  
  if (amount < config.min_amount) {
    return { matched: false, reason: `交易金额低于最低限额${config.min_amount}元` };
  }
  
  if ((order.quantity || 0) < minQuantity) {
    return { matched: false, reason: `数量不足最小成交量${minQuantity}股` };
  }
  
  if ((order.discount_rate || 0) > config.max_discount_rate) {
    return { matched: false, reason: `折扣率超过最大限制${config.max_discount_rate * 100}%` };
  }
  
  return { matched: true };
};

// 5. 一键打板风控检查
export const checkBoardRisk = (
  limitUpPrice: number,
  quantity: number,
  userUsedQuota: number,
  dailyLimitCount: number
) => {
  const config = getTradeConfig().board;
  const orderAmount = limitUpPrice * quantity;
  const remainingQuota = config.daily_user_quota - userUsedQuota;
  
  if (orderAmount > remainingQuota) {
    return {
      approved: false,
      manualRequired: true,
      reason: `超出每日限额，剩余额度${remainingQuota}元`,
      riskLevel: 'high' as const,
    };
  }
  
  if (orderAmount > config.manual_approval_threshold) {
    return {
      approved: false,
      manualRequired: true,
      reason: `金额超过${config.manual_approval_threshold}元，需人工审核`,
      riskLevel: 'high' as const,
    };
  }
  
  if (dailyLimitCount >= 3) {
    return {
      approved: false,
      manualRequired: true,
      reason: '连续涨停超过3天，高风险',
      riskLevel: 'high' as const,
    };
  }
  
  if (orderAmount > config.risk_amount_threshold) {
    return {
      approved: true,
      manualRequired: false,
      reason: '中等风险，已自动通过',
      riskLevel: 'medium' as const,
    };
  }
  
  return {
    approved: true,
    manualRequired: false,
    reason: '低风险，自动通过',
    riskLevel: 'low' as const,
  };
};

// 获取实时汇率（港币/人民币）
export const getHKDCNYRate = async (): Promise<number> => {
  // TODO: 接入实时汇率API
  return 0.92; // 默认汇率
};
