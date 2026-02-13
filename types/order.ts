export interface Order {
  id: string;
  user_id: string;
  symbol: string;
  type: 'buy' | 'sell';
  price: number;
  quantity: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  created_at: string;
}

export type TradeType = 'a-share' | 'hk-share' | 'ipo' | 'block' | 'board';
