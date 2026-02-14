export interface RechargeRequest {
  id: string;
  user_id: string;
  username: string;
  amount: number;
  currency: 'CNY' | 'HKD';
  payment_method: 'bank' | 'alipay' | 'wechat';
  payment_proof?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewer_id?: string;
  review_time?: string;
  reject_reason?: string;
  created_at: string;
}

export interface WithdrawRequest {
  id: string;
  user_id: string;
  username: string;
  amount: number;
  currency: 'CNY' | 'HKD';
  bank_name: string;
  bank_account: string;
  account_holder: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'completed';
  flow_settled: boolean;
  unsettled_amount: number;
  reviewer_id?: string;
  review_time?: string;
  reject_reason?: string;
  created_at: string;
}

// 提现规则检查
export const checkWithdrawEligibility = (
  userFlows: { settled: boolean; amount: number }[],
  withdrawAmount: number
): { eligible: boolean; reason?: string; unsettledAmount: number } => {
  const unsettledFlows = userFlows.filter(f => !f.settled);
  const unsettledAmount = unsettledFlows.reduce((sum, f) => sum + Math.abs(f.amount), 0);
  
  if (unsettledAmount > 0) {
    return {
      eligible: false,
      reason: `存在未结清流水 ${unsettledAmount.toFixed(2)} 元，必须结清后才能提现`,
      unsettledAmount,
    };
  }
  
  return { eligible: true, unsettledAmount: 0 };
};
