import { supabase } from './supabase';
import { logAudit } from './audit';
import { calculateAShare } from './trade';

// 创建订单
export async function createOrder(userId: string, orderData: any) {
  if (!supabase) throw new Error('Database not configured');
  
  const { data: user } = await supabase
    .from('users')
    .select('balance_cny, balance_hkd, frozen_balance_cny')
    .eq('id', userId)
    .single();
  
  if (!user) throw new Error('User not found');
  
  // 计算所需资金
  const { totalAmount } = calculateAShare(orderData.price, orderData.quantity, orderData.side);
  
  if (orderData.side === 'buy' && user.balance_cny < totalAmount) {
    throw new Error('余额不足');
  }
  
  // 创建订单
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      trade_type: orderData.trade_type,
      symbol: orderData.symbol,
      symbol_name: orderData.symbol_name,
      side: orderData.side,
      quantity: orderData.quantity,
      status: 'pending',
      trade_data: orderData,
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // 冻结资金
  if (orderData.side === 'buy') {
    await supabase
      .from('users')
      .update({
        balance_cny: user.balance_cny - totalAmount,
        frozen_balance_cny: user.frozen_balance_cny + totalAmount,
      })
      .eq('id', userId);
  }
  
  return order;
}

// 审核订单
export async function approveOrder(orderId: string, adminId: string, adminName: string, action: 'approve' | 'reject', reason?: string) {
  if (!supabase) throw new Error('Database not configured');
  
  const { data: order } = await supabase
    .from('orders')
    .select('*, users(*)')
    .eq('id', orderId)
    .single();
  
  if (!order) throw new Error('Order not found');
  
  const beforeData = { ...order };
  
  if (action === 'approve') {
    // 审核通过 - 执行成交
    await executeOrder(order, adminId, adminName);
  } else {
    // 审核驳回 - 解冻资金
    await rejectOrder(order, adminId, reason);
  }
  
  // 记录审计日志
  await logAudit(
    `订单${action === 'approve' ? '审核通过' : '驳回'}`,
    'order_modify',
    adminId,
    adminName,
    'order',
    orderId,
    beforeData,
    { status: action === 'approve' ? 'completed' : 'rejected', reason },
    reason
  );
  
  return { success: true };
}

// 执行订单成交
async function executeOrder(order: any, adminId: string, adminName: string) {
  const { user_id, symbol, symbol_name, side, quantity, trade_data } = order;
  const price = trade_data.price;
  const { totalAmount, commission, stampDuty, transferFee } = calculateAShare(price, quantity, side);
  
  // 更新订单状态
  await supabase!
    .from('orders')
    .update({
      status: 'completed',
      approved_by: adminId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', order.id);
  
  // 更新持仓
  if (side === 'buy') {
    // 买入：增加持仓
    const { data: existingPosition } = await supabase!
      .from('positions')
      .select('*')
      .eq('user_id', user_id)
      .eq('symbol', symbol)
      .single();
    
    if (existingPosition) {
      // 更新现有持仓
      const newQuantity = existingPosition.quantity + quantity;
      const newAvgCost = (existingPosition.avg_cost * existingPosition.quantity + price * quantity) / newQuantity;
      
      await supabase!
        .from('positions')
        .update({
          quantity: newQuantity,
          available_quantity: existingPosition.available_quantity + quantity,
          avg_cost: newAvgCost,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user_id)
        .eq('symbol', symbol);
    } else {
      // 创建新持仓
      await supabase!
        .from('positions')
        .insert({
          user_id,
          symbol,
          symbol_name,
          quantity,
          available_quantity: quantity,
          avg_cost: price,
        });
    }
  } else {
    // 卖出：减少持仓
    const { data: position } = await supabase!
      .from('positions')
      .select('*')
      .eq('user_id', user_id)
      .eq('symbol', symbol)
      .single();
    
    if (position) {
      await supabase!
        .from('positions')
        .update({
          quantity: position.quantity - quantity,
          available_quantity: position.available_quantity - quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user_id)
        .eq('symbol', symbol);
    }
  }
  
  // 更新资金
  const { data: user } = await supabase!
    .from('users')
    .select('balance_cny, frozen_balance_cny')
    .eq('id', user_id)
    .single();
  
  if (!user) throw new Error('User not found');
  
  if (side === 'buy') {
    await supabase!
      .from('users')
      .update({
        frozen_balance_cny: user.frozen_balance_cny - totalAmount,
      })
      .eq('id', user_id);
  } else {
    const newBalance = user.balance_cny + totalAmount;
    await supabase!
      .from('users')
      .update({
        balance_cny: newBalance,
      })
      .eq('id', user_id);
  }
  
  // 生成交易流水（未结清）
  const newBalance = side === 'buy' ? user.balance_cny : user.balance_cny + totalAmount;
  await supabase!
    .from('transaction_flows')
    .insert({
      user_id,
      type: 'trade',
      amount: side === 'buy' ? -totalAmount : totalAmount,
      balance_after: newBalance,
      order_id: order.id,
      description: `${side === 'buy' ? '买入' : '卖出'} ${symbol_name} ${quantity}股`,
      settled: false,
    });
  
  // 生成手续费流水
  const totalFee = commission + stampDuty + transferFee;
  if (totalFee > 0) {
    await supabase!
      .from('transaction_flows')
      .insert({
        user_id,
        type: 'fee',
        amount: -totalFee,
        order_id: order.id,
        description: '交易手续费',
        settled: true,
      });
  }
}

// 驳回订单
async function rejectOrder(order: any, adminId: string, reason?: string) {
  const { user_id, side, trade_data } = order;
  const { totalAmount } = calculateAShare(trade_data.price, order.quantity, side);
  
  // 更新订单状态
  await supabase!
    .from('orders')
    .update({
      status: 'rejected',
      approved_by: adminId,
      approved_at: new Date().toISOString(),
      reject_reason: reason,
    })
    .eq('id', order.id);
  
    // 解冻资金
    if (side === 'buy') {
      const { data: user } = await supabase!
        .from('users')
        .select('balance_cny, frozen_balance_cny')
        .eq('id', user_id)
        .single();
      
      if (!user) throw new Error('User not found');
      
      await supabase!
        .from('users')
        .update({
          balance_cny: user.balance_cny + totalAmount,
          frozen_balance_cny: user.frozen_balance_cny - totalAmount,
        })
        .eq('id', user_id);
    }
}

// 获取待审核订单
export async function getPendingOrders(tradeType?: string, page = 1, limit = 20) {
  if (!supabase) return { data: [], total: 0 };
  
  let query = supabase
    .from('orders')
    .select('*, users(username, real_name)', { count: 'exact' })
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  
  if (tradeType) {
    query = query.eq('trade_type', tradeType);
  }
  
  // Vercel优化：分页查询
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  const { data, count } = await query.range(from, to);
  return { data: data || [], total: count || 0 };
}
