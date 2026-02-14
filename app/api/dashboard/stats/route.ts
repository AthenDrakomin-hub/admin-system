import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 待审核交易
    const { count: pendingTrades } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    // 待审核充值
    const { count: pendingRecharges } = await supabase
      .from('recharge_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    // 待审核提现
    const { count: pendingWithdraws } = await supabase
      .from('withdraw_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    // 异常订单（驳回的）
    const { count: abnormalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'rejected');
    
    // 今日成交
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: todayOrders } = await supabase
      .from('orders')
      .select('trade_data')
      .eq('status', 'completed')
      .gte('created_at', today.toISOString());
    
    const todayTrades = todayOrders?.length || 0;
    const todayAmount = todayOrders?.reduce((sum, order) => {
      const data = typeof order.trade_data === 'string' 
        ? JSON.parse(order.trade_data) 
        : order.trade_data;
      return sum + (data?.amount || 0);
    }, 0) || 0;
    
    // 活跃用户（今日有操作的）
    const { count: activeUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    
    const stats = {
      pendingTrades: pendingTrades || 0,
      pendingRecharges: pendingRecharges || 0,
      pendingWithdraws: pendingWithdraws || 0,
      abnormalOrders: abnormalOrders || 0,
      todayTrades,
      todayAmount: Math.round(todayAmount),
      activeUsers: activeUsers || 0,
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
