export interface GlobalConfig {
  // 汇率配置
  exchange_rates: {
    hkd_cny: number;
    update_time: string;
  };
  
  // 手续费配置
  fees: {
    a_share_commission: number;
    a_share_stamp_duty: number;
    a_share_transfer_fee: number;
    a_share_min_commission: number;
    hk_share_commission: number;
    hk_share_min_commission: number;
  };
  
  // 打板限额
  board_limits: {
    daily_user_quota: number;
    single_order_max: number;
    manual_approval_threshold: number;
    risk_amount_threshold: number;
  };
  
  // 大宗交易门槛
  block_thresholds: {
    min_amount: number;
    max_discount_rate: number;
  };
  
  // 提现规则
  withdraw_rules: {
    min_amount: number;
    max_amount: number;
    daily_limit: number;
    require_flow_settled: boolean;
  };
  
  // 交易时间
  trading_hours: {
    a_share_open: string;
    a_share_close: string;
    hk_share_open: string;
    hk_share_close: string;
    trading_days: number[];
  };
  
  // IPO配置
  ipo_config: {
    max_apply_amount: number;
    qualification_days: number;
  };
}

export const defaultConfig: GlobalConfig = {
  exchange_rates: {
    hkd_cny: 0.92,
    update_time: new Date().toISOString(),
  },
  fees: {
    a_share_commission: 0.0003,
    a_share_stamp_duty: 0.001,
    a_share_transfer_fee: 0.00002,
    a_share_min_commission: 5,
    hk_share_commission: 0.0003,
    hk_share_min_commission: 50,
  },
  board_limits: {
    daily_user_quota: 100000,
    single_order_max: 200000,
    manual_approval_threshold: 100000,
    risk_amount_threshold: 50000,
  },
  block_thresholds: {
    min_amount: 2000000,
    max_discount_rate: 0.1,
  },
  withdraw_rules: {
    min_amount: 100,
    max_amount: 1000000,
    daily_limit: 5000000,
    require_flow_settled: true,
  },
  trading_hours: {
    a_share_open: '09:30',
    a_share_close: '15:00',
    hk_share_open: '09:30',
    hk_share_close: '16:00',
    trading_days: [1, 2, 3, 4, 5],
  },
  ipo_config: {
    max_apply_amount: 1000000,
    qualification_days: 20,
  },
};
