import { NextRequest } from 'next/server';
import { clientResponse, clientError } from '@/lib/client';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';
import { calculateHKShare, getHKDCNYRate } from '@/lib/trade';

/**
 * 港股交易API
 * POST /api/client/trade/hk-share - 港股下单
 * GET /api/client/trade/hk-share - 查询港股订单
 * DELETE /api/client/trade/hk-share - 撤单
 */

// 港股下单
export async function POST(req: NextRequest) {
  try {
    // 验证用户身份
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return clientError('未授权访问', 401);
    }

    const token = authHeader.substring(7);
    const authUser = await verifyAuth(token);

    if (!authUser) {
      return clientError('无效的认证信息', 401);
    }

    const { symbol, symbolName, side, priceHKD, quantity } = await req.json();
    
    if (!symbol || !side || !priceHKD || !quantity) {
      return clientError('缺少必要参数');
    }

    if (!supabase) {
      return clientError('Database not configured');
    }

    // 获取用户信息
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, balance_hkd, frozen_balance_hkd')
      .eq('username', authUser.username)
      .single();

    if (userError || !user) {
      return clientError('用户不存在', 404);
    }

    // 获取实时汇率
    const exchangeRate = await getHKDCNYRate();
    
    // 计算港股交易金额
    const { amountHKD, amountCNY, commissionHKD, commissionCNY, totalAmountHKD, totalAmountCNY } = 
      calculateHKShare(priceHKD, quantity, exchangeRate, side);

    // 检查余额（港股交易使用HKD余额）
    if (side === 'buy' && user.balance_hkd < totalAmountHKD) {
      return clientError('HKD余额不足');
    }

    // 创建港股订单
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        trade_type: 'hk_share',
        symbol,
        symbol_name: symbolName || symbol,
        side,
        price: priceHKD,
        quantity,
        currency: 'HKD',
        status: 'pending',
        trade_data: {
          price_hkd: priceHKD,
          exchange_rate: exchangeRate,
          amount_hkd: amountHKD,
          amount_cny: amountCNY,
          commission_hkd: commissionHKD,
          commission_cny: commissionCNY,
          total_amount_hkd: totalAmountHKD,
          total_amount_cny: totalAmountCNY
        }
      })
      .select()
      .single();

    if (orderError) {
      throw orderError;
    }

    // 如果是买单，冻结HKD资金
    if (side === 'buy') {
      const { error: freezeError } = await supabase
        .from('users')
        .update({
          balance_hkd: supabase.rpc('decrement', { x: totalAmountHKD }),
          frozen_balance_hkd: supabase.rpc('increment', { x: totalAmountHKD })
        })
        .eq('id', user.id);

      if (freezeError) {
        console.error('冻结HKD资金失败:', freezeError);
        // 回滚订单创建
        await supabase.from('orders').delete().eq('id', order.id);
        throw freezeError;
      }
    }

    return clientResponse({ 
      orderId: order.id, 
      status: 'pending',
      currency: 'HKD',
      amountHKD,
      totalAmountHKD,
      exchangeRate
    });
  } catch (error: any) {
    console.error('港股下单错误:', error);
    return clientError(error.message || '港股下单失败');
  }
}

// 查询港股订单
export async function GET(req: NextRequest) {
  try {
    // 验证用户身份
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return clientError('未授权访问', 401);
    }

    const token = authHeader.substring(7);
    const authUser = await verifyAuth(token);

    if (!authUser) {
      return clientError('无效的认证信息', 401);
    }

    if (!supabase) {
      return clientError('Database not configured');
    }

    // 获取用户ID
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('username', authUser.username)
      .single();

    if (!user) {
      return clientError('用户不存在', 404);
    }

    const { searchParams } = req.nextUrl;
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('status');

    let query = supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .eq('trade_type', 'hk_share')
      .order('created_at', { ascending: false });

    if (orderId) {
      query = query.eq('id', orderId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders } = await query.limit(50);

    return clientResponse({ orders: orders || [] });
  } catch (error: any) {
    console.error('查询港股订单错误:', error);
    return clientError(error.message || '查询港股订单失败');
  }
}

// 港股撤单
export async function DELETE(req: NextRequest) {
  try {
    // 验证用户身份
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return clientError('未授权访问', 401);
    }

    const token = authHeader.substring(7);
    const authUser = await verifyAuth(token);

    if (!authUser) {
      return clientError('无效的认证信息', 401);
    }

    const { searchParams } = req.nextUrl;
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return clientError('缺少订单ID');
    }

    if (!supabase) {
      return clientError('Database not configured');
    }

    // 查询订单信息
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('trade_type', 'hk_share')
      .single();

    if (orderError || !order) {
      return clientError('港股订单不存在', 404);
    }

    // 验证订单所属用户
    const { data: user } = await supabase
      .from('users')
      .select('username')
      .eq('id', order.user_id)
      .single();

    if (!user || user.username !== authUser.username) {
      return clientError('无权操作此订单', 403);
    }

    // 检查订单状态（只有pending状态的订单可以撤单）
    if (order.status !== 'pending') {
      return clientError(`订单状态为${order.status}，无法撤单`);
    }

    // 更新订单状态为cancelled
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: '用户主动撤单'
      })
      .eq('id', orderId);

    if (updateError) {
      throw updateError;
    }

    // 如果是买单，解冻HKD资金
    if (order.side === 'buy') {
      const tradeData = order.trade_data || {};
      const totalAmountHKD = tradeData.total_amount_hkd || 0;
      
      if (totalAmountHKD > 0) {
        const { error: unfreezeError } = await supabase
          .from('users')
          .update({
            balance_hkd: supabase.rpc('increment', { x: totalAmountHKD }),
            frozen_balance_hkd: supabase.rpc('decrement', { x: totalAmountHKD })
          })
          .eq('id', order.user_id);

        if (unfreezeError) {
          console.error('解冻HKD资金失败:', unfreezeError);
        }
      }
    }

    return clientResponse({ success: true, message: '港股撤单成功' });
  } catch (error: any) {
    console.error('港股撤单错误:', error);
    return clientError(error.message || '港股撤单失败');
  }
}
