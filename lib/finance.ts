import { supabase } from './supabase';
import { logAudit } from './audit';

// 审核充值
export async function approveRecharge(requestId: string, adminId: string, adminName: string, action: 'approve' | 'reject', reason?: string) {
  if (!supabase) throw new Error('Database not configured');
  
  const { data: request, error: fetchError } = await supabase
    .from('recharge_requests')
    .select('*, users(*)')
    .eq('id', requestId)
    .single();
  
  if (fetchError || !request) {
    throw new Error('充值申请不存在');
  }
  
  if (request.status !== 'pending') {
    throw new Error('该申请已处理，无法重复操作');
  }
  
  // 验证用户信息完整性
  if (action === 'approve') {
    const user = request.users;
    if (!user) throw new Error('用户不存在');
    if (user.status === 'frozen') throw new Error('用户已冻结，无法充值');
    
    // 加资金
    const field = request.currency === 'CNY' ? 'balance_cny' : 'balance_hkd';
    const currentBalance = user[field] || 0;
    const newBalance = currentBalance + request.amount;
    
    const { error: updateError } = await supabase
      .from('users')
      .update({
        [field]: newBalance,
        total_deposit: (user.total_deposit || 0) + request.amount,
      })
      .eq('id', request.user_id);
    
    if (updateError) throw new Error('更新用户余额失败: ' + updateError.message);
    
    // 生成流水
    const { error: flowError } = await supabase
      .from('transaction_flows')
      .insert({
        user_id: request.user_id,
        type: 'deposit',
        amount: request.amount,
        balance_after: newBalance,
        description: `充值 ${request.currency} ${request.amount}`,
        settled: true,
      });
    
    if (flowError) throw new Error('生成流水失败: ' + flowError.message);
  }
  
  // 更新申请状态
  const { error: statusError } = await supabase
    .from('recharge_requests')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewer_id: adminId,
      review_time: new Date().toISOString(),
      reject_reason: reason,
    })
    .eq('id', requestId);
  
  if (statusError) throw new Error('更新申请状态失败: ' + statusError.message);
  
  await logAudit(
    `充值${action === 'approve' ? '审核通过' : '驳回'}`,
    'fund_adjust',
    adminId,
    adminName,
    'user',
    request.user_id,
    request,
    { status: action, amount: request.amount },
    reason
  );
  
  return { success: true };
}

// 审核提现
export async function approveWithdraw(requestId: string, adminId: string, adminName: string, action: 'approve' | 'reject', reason?: string) {
  if (!supabase) throw new Error('Database not configured');
  
  const { data: request, error: fetchError } = await supabase
    .from('withdraw_requests')
    .select('*, users(*)')
    .eq('id', requestId)
    .single();
  
  if (fetchError || !request) {
    throw new Error('提现申请不存在');
  }
  
  if (request.status !== 'pending') {
    throw new Error('该申请已处理，无法重复操作');
  }
  
  // 验证用户信息完整性
  const user = request.users;
  if (!user) throw new Error('用户不存在');
  if (user.status === 'frozen') throw new Error('用户已冻结，无法提现');
  
  // 验证银行信息（优先使用申请中的，其次使用用户资料中的）
  if (action === 'approve') {
    const bankName = request.bank_name || user.bank_name;
    const bankAccount = request.bank_account || user.bank_account;
    const accountHolder = request.account_holder || user.account_holder;
    
    if (!bankName || !bankAccount || !accountHolder) {
      throw new Error('银行信息不完整，请联系用户补充资料（银行名称、银行账号、开户人姓名）');
    }
    
    // 扣资金
    const field = request.currency === 'CNY' ? 'balance_cny' : 'balance_hkd';
    const currentBalance = user[field] || 0;
    
    if (currentBalance < request.amount) {
      throw new Error('用户余额不足');
    }
    
    const newBalance = currentBalance - request.amount;
    
    const { error: updateError } = await supabase
      .from('users')
      .update({
        [field]: newBalance,
        total_withdraw: (user.total_withdraw || 0) + request.amount,
      })
      .eq('id', request.user_id);
    
    if (updateError) throw new Error('更新用户余额失败: ' + updateError.message);
    
    // 生成流水
    const { error: flowError } = await supabase
      .from('transaction_flows')
      .insert({
        user_id: request.user_id,
        type: 'withdraw',
        amount: -request.amount,
        balance_after: newBalance,
        description: `提现 ${request.currency} ${request.amount}`,
        settled: true,
      });
    
    if (flowError) throw new Error('生成流水失败: ' + flowError.message);
  }
  
  // 更新申请状态
  const { error: statusError } = await supabase
    .from('withdraw_requests')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewer_id: adminId,
      review_time: new Date().toISOString(),
      reject_reason: reason,
    })
    .eq('id', requestId);
  
  if (statusError) throw new Error('更新申请状态失败: ' + statusError.message);
  
  await logAudit(
    `提现${action === 'approve' ? '审核通过' : '驳回'}`,
    'fund_adjust',
    adminId,
    adminName,
    'user',
    request.user_id,
    request,
    { status: action, amount: request.amount },
    reason
  );
  
  return { success: true };
}

// 获取待审核充值
export async function getPendingRecharges(page = 1, limit = 20) {
  if (!supabase) return { data: [], total: 0 };
  
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  const { data, count } = await supabase
    .from('recharge_requests')
    .select('*, users(username, real_name)', { count: 'exact' })
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .range(from, to);
  
  return { data: data || [], total: count || 0 };
}

// 获取待审核提现
export async function getPendingWithdraws(page = 1, limit = 20) {
  if (!supabase) return { data: [], total: 0 };
  
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  const { data, count } = await supabase
    .from('withdraw_requests')
    .select('*, users(username, real_name)', { count: 'exact' })
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .range(from, to);
  
  return { data: data || [], total: count || 0 };
}

// 流水结清
export async function settleFlows(userId: string) {
  if (!supabase) throw new Error('Database not configured');
  
  await supabase
    .from('transaction_flows')
    .update({ settled: true })
    .eq('user_id', userId)
    .eq('settled', false);
  
  return { success: true };
}
