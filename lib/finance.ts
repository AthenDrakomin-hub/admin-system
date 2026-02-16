// lib/finance.ts
import { supabaseAdmin } from '@/lib/supabase'; // 必须导入这个

// 管理端-获取充值申请列表
export const getRechargeRequests = async (status?: string) => {
  try {
    let query = supabaseAdmin.from('recharge_requests').select('*, users(username)');
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase 查询错误:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('获取充值申请失败:', error);
    throw new Error(`获取充值申请失败: ${(error as Error).message}`);
  }
};

// 管理端-获取提现申请列表
export const getWithdrawRequests = async (status?: string) => {
  try {
    let query = supabaseAdmin.from('withdraw_requests').select('*, users(username)');
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      console.error('Supabase 查询错误:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('获取提现申请失败:', error);
    throw new Error(`获取提现申请失败: ${(error as Error).message}`);
  }
};

// 带分页的提现申请查询函数（新增）
export async function getWithdrawRequestsWithPagination(page = 1, limit = 50) {
  try {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 必须用 supabaseAdmin，不是 supabaseClient
    const { data, error, count } = await supabaseAdmin
      .from('withdraw_requests')
      .select('*', { count: 'exact' })
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase 查询错误:', error);
      throw error;
    }

    return {
      list: data || [],
      total: count || 0,
    };
  } catch (error) {
    console.error('获取提现申请失败:', error);
    throw new Error(`获取提现申请失败: ${(error as Error).message}`);
  }
}

// 管理端-审批充值申请
export const approveRechargeRequest = async (requestId: string, approve: boolean) => {
  try {
    // 1. 更新申请状态
    const { error } = await supabaseAdmin
      .from('recharge_requests')
      .update({
        status: approve ? 'approved' : 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('request_id', requestId);
    
    if (error) {
      console.error('Supabase 更新错误:', error);
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('审批充值申请失败:', error);
    throw new Error(`审批充值申请失败: ${(error as Error).message}`);
  }
};

// 管理端-审批提现申请
export const approveWithdrawRequest = async (requestId: string, approve: boolean) => {
  try {
    // 1. 更新申请状态
    const updateData: any = {
      status: approve ? 'approved' : 'rejected',
      updated_at: new Date().toISOString()
    };
    
    // 如果审批通过，将未结清金额设为0
    if (approve) {
      updateData.unsettled_amount = 0;
    }
    
    const { error } = await supabaseAdmin
      .from('withdraw_requests')
      .update(updateData)
      .eq('request_id', requestId);
    
    if (error) {
      console.error('Supabase 更新错误:', error);
      throw error;
    }
    
    // 2. 审批通过时，更新流水状态为已结清
    if (approve) {
      await supabaseAdmin
        .from('finance_flows')
        .update({ settled: true })
        .eq('description', `提现-${requestId.substring(0, 8)}`) // 匹配流水描述
        .eq('type', 'withdraw');
    }
    
    return { success: true };
  } catch (error) {
    console.error('审批提现申请失败:', error);
    throw new Error(`审批提现申请失败: ${(error as Error).message}`);
  }
};

// 其他原有函数保持不变