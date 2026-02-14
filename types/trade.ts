// 交易类型枚举
export type TradeType = 'a-share' | 'hk-share' | 'ipo' | 'block' | 'board';

// 订单状态
export type OrderStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';

// 基础订单接口
export interface BaseOrder {
  id: string;
  user_id: string;
  trade_type: TradeType;
  symbol: string;
  symbol_name: string;
  side: 'buy' | 'sell';
  quantity: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  approved_by?: string;
  approved_at?: string;
  reject_reason?: string;
}

// 1. A股常规交易
export interface AShareOrder extends BaseOrder {
  trade_type: 'a-share';
  price: number;
  amount: number;
  commission_rate: number;
  stamp_duty_rate: number;
  transfer_fee_rate: number;
}

// 2. 港股交易
export interface HKShareOrder extends BaseOrder {
  trade_type: 'hk-share';
  price_hkd: number;
  price_cny: number;
  exchange_rate: number;
  amount_hkd: number;
  amount_cny: number;
  commission_rate: number;
  currency: 'HKD' | 'CNY';
}

// 3. 新股申购
export interface IPOOrder extends BaseOrder {
  trade_type: 'ipo';
  ipo_code: string;
  ipo_name: string;
  issue_price: number;
  apply_quantity: number;
  frozen_amount: number;
  qualification_status: 'qualified' | 'unqualified' | 'pending';
  qualification_reason?: string;
  lottery_status: 'pending' | 'won' | 'lost';
  won_quantity?: number;
  lottery_date?: string;
}

// 4. 大宗交易
export interface BlockOrder extends BaseOrder {
  trade_type: 'block';
  price: number;
  min_quantity: number;
  total_amount: number;
  discount_rate?: number;
  counterparty?: string;
  settlement_date?: string;
  is_matched: boolean;
}

// 5. 一键打板
export interface BoardOrder extends BaseOrder {
  trade_type: 'board';
  limit_up_price: number;
  risk_level: 'low' | 'medium' | 'high';
  daily_limit_count: number;
  user_quota: number;
  used_quota: number;
  manual_approval_required: boolean;
  risk_warning?: string;
}

// 联合类型
export type Order = AShareOrder | HKShareOrder | IPOOrder | BlockOrder | BoardOrder;

// 交易配置
export interface TradeConfig {
  a_share: {
    commission_rate: number;
    stamp_duty_rate: number;
    transfer_fee_rate: number;
    min_commission: number;
  };
  hk_share: {
    commission_rate: number;
    min_commission_hkd: number;
    exchange_rate_buffer: number;
  };
  ipo: {
    max_apply_amount: number;
    qualification_days: number;
  };
  block: {
    min_amount: number;
    max_discount_rate: number;
  };
  board: {
    daily_user_quota: number;
    risk_amount_threshold: number;
    manual_approval_threshold: number;
  };
}
