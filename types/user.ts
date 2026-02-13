export interface User {
  id: string;
  username: string;
  balance: number;
  frozen_balance: number;
  created_at: string;
}

export interface Position {
  id: string;
  user_id: string;
  symbol: string;
  quantity: number;
  avg_price: number;
}

export interface Flow {
  id: string;
  user_id: string;
  type: 'recharge' | 'withdraw' | 'trade';
  amount: number;
  created_at: string;
}
