export interface UserAccount {
  id: string;
  username: string;
  real_name: string;
  phone: string;
  id_card: string;
  status: 'active' | 'frozen' | 'suspended';
  balance_cny: number;
  balance_hkd: number;
  frozen_balance_cny: number;
  frozen_balance_hkd: number;
  total_deposit: number;
  total_withdraw: number;
  trade_days: number;
  created_at: string;
  last_login?: string;
}

export interface FundOperation {
  id: string;
  user_id: string;
  type: 'deposit' | 'withdraw' | 'adjust';
  currency: 'CNY' | 'HKD';
  amount: number;
  before_balance: number;
  after_balance: number;
  operator_id: string;
  reason: string;
  created_at: string;
}

export interface UserPosition {
  id: string;
  user_id: string;
  symbol: string;
  symbol_name: string;
  quantity: number;
  available_quantity: number;
  frozen_quantity: number;
  avg_cost: number;
  market_value: number;
  profit_loss: number;
  profit_loss_rate: number;
}

export interface TransactionFlow {
  id: string;
  user_id: string;
  type: 'trade' | 'deposit' | 'withdraw' | 'fee' | 'adjust';
  amount: number;
  balance_after: number;
  order_id?: string;
  description: string;
  settled: boolean;
  created_at: string;
}
