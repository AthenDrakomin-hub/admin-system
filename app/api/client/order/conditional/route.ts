import { NextRequest } from 'next/server';
import { clientResponse, clientError } from '@/lib/client';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

/**
 * 条件单API
 * POST /api/client/order/conditional - 创建条件单
 * GET /api/client/order/conditional - 查询条件单列表
 * DELETE /api/client/order/conditional - 删除条件单
 */

// 创建条件单
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

    const { 
      symbol, 
      symbolName, 
      side, 
      orderType, 
      price, 
      quantity, 
      conditionType, 
      triggerPrice, 
      triggerCondition,
      expiryDate,
      note 
    } = await req.json();
    
    if (!symbol || !side || !orderType || !quantity || !conditionType || !triggerPrice) {
      return clientError('缺少必要参数');
    }

    if (!supabase) {
      return clientError('Database not configured');
    }

    // 获取用户信息
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, balance_cny, balance_hkd')
      .eq('username', authUser.username)
      .single();

    if (userError || !user) {
      return clientError('用户不存在', 404);
    }

    // 计算订单金额
    let orderAmount = 0;
    let currency = 'CNY';
    
    if (orderType === 'limit' && price) {
      orderAmount = price * quantity;
    } else if (orderType === 'market') {
      // 市价单需要预估金额，这里使用触发价格估算
      orderAmount = triggerPrice * quantity * 1.05; // 加5%保证金
    }

    // 检查余额（如果是买单）
    if (side === 'buy') {
      if (currency === 'CNY' && user.balance_cny < orderAmount) {
        return clientError('CNY余额不足');
      } else if (currency === 'HKD' && user.balance_hkd < orderAmount) {
        return clientError('HKD余额不足');
      }
    }

    // 创建条件单
    const { data: conditionalOrder, error: orderError } = await supabase
      .from('conditional_orders')
      .insert({
        user_id: user.id,
        symbol,
        symbol_name: symbolName || symbol,
        side,
        order_type: orderType,
        price: price || null,
        quantity,
        condition_type: conditionType,
        trigger_price: triggerPrice,
        trigger_condition: triggerCondition || 'gte', // gte: 大于等于, lte: 小于等于
        current_price: null,
        status: 'active',
        order_amount: orderAmount,
        currency,
        expiry_date: expiryDate || null,
        note: note || ''
      })
      .select()
      .single();

    if (orderError) {
      throw orderError;
    }

    // 如果是买单，冻结资金
    if (side === 'buy' && orderAmount > 0) {
      const updateField = currency === 'CNY' ? 'balance_cny' : 'balance_hkd';
      const freezeField = currency === 'CNY' ? 'frozen_balance_cny' : 'frozen_balance_hkd';
      
      const { error: freezeError } = await supabase
        .from('users')
        .update({
          [updateField]: supabase.rpc('decrement', { x: orderAmount }),
          [freezeField]: supabase.rpc('increment', { x: orderAmount })
        })
        .eq('id', user.id);

      if (freezeError) {
        console.error('冻结资金失败:', freezeError);
        // 回滚条件单创建
        await supabase.from('conditional_orders').delete().eq('id', conditionalOrder.id);
        throw freezeError;
      }
    }

    return clientResponse({ 
      orderId: conditionalOrder.id, 
      status: 'active',
      orderAmount,
      currency
    });
  } catch (error: any) {
    console.error('创建条件单错误:', error);
    return clientError(error.message || '创建条件单失败');
  }
}

// 查询条件单列表
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
    const status = searchParams.get('status');
    const side = searchParams.get('side');
    const symbol = searchParams.get('symbol');

    let query = supabase
      .from('conditional_orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (side) {
      query = query.eq('side', side);
    }

    if (symbol) {
      query = query.eq('symbol', symbol);
    }

    const { data: orders } = await query.limit(50);

    return clientResponse({ orders: orders || [] });
  } catch (error: any) {
    console.error('查询条件单错误:', error);
    return clientError(error.message || '查询条件单失败');
  }
}

// 删除条件单
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
      return clientError('缺少条件单ID');
    }

    if (!supabase) {
      return clientError('Database not configured');
    }

    // 查询条件单信息
    const { data: order, error: orderError } = await supabase
      .from('conditional_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return clientError('条件单不存在', 404);
    }

    // 验证条件单所属用户
    const { data: user } = await supabase
      .from('users')
      .select('username')
      .eq('id', order.user_id)
      .single();

    if (!user || user.username !== authUser.username) {
      return clientError('无权操作此条件单', 403);
    }

    // 检查条件单状态
    if (order.status === 'triggered' || order.status === 'executed' || order.status === 'expired') {
      return clientError(`条件单状态为${order.status}，无法删除`);
    }

    // 更新条件单状态为cancelled
    const { error: updateError } = await supabase
      .from('conditional_orders')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: '用户主动取消'
      })
      .eq('id', orderId);

    if (updateError) {
      throw updateError;
    }

    // 如果是买单且已冻结资金，解冻资金
    if (order.side === 'buy' && order.order_amount > 0 && order.status === 'active') {
      const updateField = order.currency === 'CNY' ? 'balance_cny' : 'balance_hkd';
      const freezeField = order.currency === 'CNY' ? 'frozen_balance_cny' : 'frozen_balance_hkd';
      
      const { error: unfreezeError } = await supabase
        .from('users')
        .update({
          [updateField]: supabase.rpc('increment', { x: order.order_amount }),
          [freezeField]: supabase.rpc('decrement', { x: order.order_amount })
        })
        .eq('id', order.user_id);

      if (unfreezeError) {
        console.error('解冻资金失败:', unfreezeError);
      }
    }

    return clientResponse({ success: true, message: '条件单删除成功' });
  } catch (error: any) {
    console.error('删除条件单错误:', error);
    return clientError(error.message || '删除条件单失败');
  }
}
