export interface Recharge {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface Withdraw {
  id: string;
  user_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  bank_account: string;
  created_at: string;
}
