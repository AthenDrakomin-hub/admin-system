import { NextRequest } from 'next/server';
import { clientResponse, clientError } from '@/lib/client';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { userId, type, amount, currency, paymentMethod, bankInfo } = await req.json();
    
    if (!userId || !type || !amount) {
      return clientError('缺少必要参数');
    }
    
    if (!supabase) {
      return clientError('Database not configured');
    }
    
    if (type === 'recharge') {
      // 创建充值申请
      const { data, error } = await supabase
        .from('recharge_requests')
        .insert({
          user_id: userId,
          amount,
          currency: currency || 'CNY',
          payment_method: paymentMethod,
          status: 'pending',
        })
        .select()
        .single();
      
      if (error) throw error;
      return clientResponse({ requestId: data.id, status: 'pending' });
      
    } else if (type === 'withdraw') {
      // 检查余额
      const { data: user } = await supabase
        .from('users')
        .select('balance_cny, balance_hkd')
        .eq('id', userId)
        .single();
      
      const field = currency === 'HKD' ? 'balance_hkd' : 'balance_cny';
      if (!user || (user[field] || 0) < amount) {
        return clientError('余额不足');
      }
      
      // 检查流水是否结清
      const { data: unsettled } = await supabase
        .from('transaction_flows')
        .select('amount')
        .eq('user_id', userId)
        .eq('settled', false);
      
      const unsettledAmount = unsettled?.reduce((sum, f) => sum + Math.abs(f.amount), 0) || 0;
      
      // 创建提现申请
      const { data, error } = await supabase
        .from('withdraw_requests')
        .insert({
          user_id: userId,
          amount,
          currency: currency || 'CNY',
          bank_name: bankInfo?.bankName,
          bank_account: bankInfo?.bankAccount,
          account_holder: bankInfo?.accountHolder,
          status: 'pending',
          flow_settled: unsettledAmount === 0,
          unsettled_amount: unsettledAmount,
        })
        .select()
        .single();
      
      if (error) throw error;
      return clientResponse({ requestId: data.id, status: 'pending', unsettledAmount });
    }
    
    return clientError('Invalid type');
  } catch (error: any) {
    return clientError(error.message);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return clientError('缺少用户ID');
    }
    
    if (!supabase) {
      return clientError('Database not configured');
    }
    
    const { data: flows } = await supabase
      .from('transaction_flows')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    
    return clientResponse({ flows: flows || [] });
  } catch (error: any) {
    return clientError(error.message);
  }
}
