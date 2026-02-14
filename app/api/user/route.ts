import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (userId) {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId);
      
      if (error) throw error;
      return NextResponse.json({ success: true, data: users || [] });
    }
    
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return NextResponse.json({ success: true, data: users || [] });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 资金调整
    if (body.action === 'adjust_balance') {
      const { userId, amount, currency, reason, adminId, adminName } = body;
      
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (fetchError || !user) {
        return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
      }
      
      const field = currency === 'CNY' ? 'balance_cny' : 'balance_hkd';
      const currentBalance = user[field] || 0;
      const newBalance = currentBalance + amount;
      
      if (newBalance < 0) {
        return NextResponse.json({ success: false, error: '余额不足' }, { status: 400 });
      }
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ [field]: newBalance })
        .eq('id', userId);
      
      if (updateError) throw updateError;
      
      // 生成流水
      await supabase.from('transaction_flows').insert({
        user_id: userId,
        type: 'adjust',
        amount,
        balance_after: newBalance,
        description: `管理员调整: ${reason}`,
        settled: true,
      });
      
      // 记录审计
      await supabase.from('audit_logs').insert({
        action: '资金调整',
        action_type: 'fund_adjust',
        operator_id: adminId,
        operator_name: adminName,
        target_type: 'user',
        target_id: userId,
        before_data: { [field]: currentBalance },
        after_data: { [field]: newBalance },
        reason,
      });
      
      return NextResponse.json({ success: true });
    }
    
    if (body.id) {
      // 更新用户
      const { error } = await supabase
        .from('users')
        .update(body)
        .eq('id', body.id);
      
      if (error) throw error;
    } else {
      // 创建用户
      const { error } = await supabase
        .from('users')
        .insert([body]);
      
      if (error) throw error;
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save user' },
      { status: 500 }
    );
  }
}
