import { NextRequest } from 'next/server';
import { clientResponse, clientError } from '@/lib/client';
import { createOrder } from '@/lib/order-service';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { userId, symbol, symbolName, tradeType, side, price, quantity } = await req.json();
    
    if (!userId || !symbol || !tradeType || !side || !price || !quantity) {
      return clientError('缺少必要参数');
    }
    
    const order = await createOrder(userId, {
      trade_type: tradeType,
      symbol,
      symbol_name: symbolName,
      side,
      price,
      quantity,
    });
    
    return clientResponse({ orderId: order.id, status: 'pending' });
  } catch (error: any) {
    return clientError(error.message);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return clientError('缺少用户ID');
    }
    
    if (!supabase) {
      return clientError('Database not configured');
    }
    
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    return clientResponse({ orders: orders || [] });
  } catch (error: any) {
    return clientError(error.message);
  }
}

/**
 * 撤单功能
 * DELETE /api/client/order?orderId=xxx
 * 需要Authorization头: Bearer <token>
 */
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
      .single();

    if (orderError || !order) {
      return clientError('订单不存在', 404);
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

    // 如果是买单，解冻资金
    if (order.side === 'buy') {
      const { data: tradeData } = order.trade_data;
      const price = tradeData?.price || order.price;
      const quantity = order.quantity;
      
      // 计算订单总金额（使用A股计算逻辑）
      const { calculateAShare } = await import('@/lib/trade');
      const { totalAmount } = calculateAShare(price, quantity, 'buy');
      
      // 解冻资金
      const { error: unfreezeError } = await supabase
        .from('users')
        .update({
          balance_cny: supabase.rpc('increment', { x: totalAmount }),
          frozen_balance_cny: supabase.rpc('decrement', { x: totalAmount })
        })
        .eq('id', order.user_id);

      if (unfreezeError) {
        console.error('解冻资金失败:', unfreezeError);
      }
    }

    return clientResponse({ success: true, message: '撤单成功' });
  } catch (error: any) {
    console.error('撤单错误:', error);
    return clientError(error.message || '撤单失败');
  }
}
