// lib/finance.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// 初始化Supabase
const getSupabase = () => {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );
};

// 管理端-获取充值申请列表
export const getRechargeRequests = async (status?: string) => {
  const supabase = getSupabase();
  let query = supabase.from('recharge_requests').select('*, users(username)');
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`获取充值申请失败: ${error.message}`);
  }
  return data;
};

// 管理端-获取提现申请列表
export const getWithdrawRequests = async (status?: string) => {
  const supabase = getSupabase();
  let query = supabase.from('withdraw_requests').select('*, users(username)');
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) {
    throw new Error(`获取提现申请失败: ${error.message}`);
  }
  return data;
};

// 管理端-审批充值申请
export const approveRechargeRequest = async (requestId: string, approve: boolean) => {
  const supabase = getSupabase();
  
  // 1. 更新申请状态
  const { error } = await supabase
    .from('recharge_requests')
    .update({
      status: approve ? 'approved' : 'rejected',
      updated_at: new Date().toISOString()
    })
    .eq('request_id', requestId);
  
  if (error) {
    throw new Error(`审批充值申请失败: ${error.message}`);
  }
  
  return { success: true };
};

// 管理端-审批提现申请
export const approveWithdrawRequest = async (requestId: string, approve: boolean) => {
  const supabase = getSupabase();
  
  // 1. 更新申请状态
  const updateData: any = {
    status: approve ? 'approved' : 'rejected',
    updated_at: new Date().toISOString()
  };
  
  // 如果审批通过，将未结清金额设为0
  if (approve) {
    updateData.unsettled_amount = 0;
  }
  
  const { error } = await supabase
    .from('withdraw_requests')
    .update(updateData)
    .eq('request_id', requestId);
  
  if (error) {
    throw new Error(`审批提现申请失败: ${error.message}`);
  }
  
  // 2. 审批通过时，更新流水状态为已结清
  if (approve) {
    await supabase
      .from('finance_flows')
      .update({ settled: true })
      .eq('description', `提现-${requestId.substring(0, 8)}`) // 匹配流水描述
      .eq('type', 'withdraw');
  }
  
  return { success: true };
};

// 其他原有函数保持不变