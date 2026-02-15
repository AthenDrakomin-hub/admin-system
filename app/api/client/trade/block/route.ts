import { NextRequest } from 'next/server';
import { clientResponse, clientError } from '@/lib/client';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';
import { matchBlockTrade } from '@/lib/trade';

/**
 * 大宗交易API
 * POST /api/client/trade/block - 创建大宗交易订单
 * GET /api/client/trade/block - 查询大宗交易列表
 * GET /api/client/trade/block/history - 查询大宗交易历史
 */

// 创建大宗交易订单
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

    const { symbol, symbolName, side, price, quantity, discountRate, note } = await req.json();
    
    if (!symbol || !side || !price || !quantity) {
      return clientError('缺少必要参数');
    }

    if (!supabase) {
      return clientError('Database not configured');
    }

    // 获取用户信息
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, balance_cny')
      .eq('username', authUser.username)
      .single();

    if (userError || !user) {
      return clientError('用户不存在', 404);
    }

    // 检查大宗交易资格
    const matchResult = matchBlockTrade({ price, quantity, discountRate }, 10000); // 最小成交量10000股
    
    if (!matchResult.matched) {
      return clientError(matchResult.reason || '不符合大宗交易条件');
    }

    const amount = price * quantity;
    
    // 检查余额（如果是买单）
    if (side === 'buy' && user.balance_cny < amount) {
      return clientError('CNY余额不足');
    }

    // 创建大宗交易订单
    const { data: order, error: orderError } = await supabase
      .from('block_orders')
      .insert({
        user_id: user.id,
        symbol,
        symbol_name: symbolName || symbol,
        side,
        price,
        quantity,
        amount,
        discount_rate: discountRate || 0,
        status: 'pending',
        note: note || '',
        matched_quantity: 0
      })
      .select()
      .single();

    if (orderError) {
      throw orderError;
    }

    // 如果是买单，冻结资金
    if (side === 'buy') {
      const { error: freezeError } = await supabase
        .from('users')
        .update({
          balance_cny: supabase.rpc('decrement', { x: amount }),
          frozen_balance_cny: supabase.rpc('increment', { x: amount })
        })
        .eq('id', user.id);

      if (freezeError) {
        console.error('冻结资金失败:', freezeError);
        // 回滚订单创建
        await supabase.from('block_orders').delete().eq('id', order.id);
        throw freezeError;
      }
    }

    return clientResponse({ 
      orderId: order.id, 
      status: 'pending',
      amount,
      matchResult: matchResult
    });
  } catch (error: any) {
    console.error('大宗交易下单错误:', error);
    return clientError(error.message || '大宗交易下单失败');
  }
}

// 查询大宗交易列表
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const type = searchParams.get('type') || 'list'; // list: 可参与列表, history: 历史记录
    const side = searchParams.get('side'); // buy/sell
    const symbol = searchParams.get('symbol');

    if (!supabase) {
      return clientError('Database not configured');
    }

    if (type === 'history') {
      // 查询历史记录需要认证
      const authHeader = req.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return clientError('未授权访问', 401);
      }

      const token = authHeader.substring(7);
      const authUser = await verifyAuth(token);

      if (!authUser) {
        return clientError('无效的认证信息', 401);
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

      let query = supabase
        .from('block_orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (side) {
        query = query.eq('side', side);
      }

      if (symbol) {
        query = query.eq('symbol', symbol);
      }

      const { data: orders } = await query.limit(50);

      return clientResponse({ orders: orders || [] });
    } else {
      // 查询可参与的大宗交易列表（不需要认证）
      let query = supabase
        .from('block_orders')
        .select('*, users(username, real_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (side) {
        query = query.eq('side', side);
      }

      if (symbol) {
        query = query.eq('symbol', symbol);
      }

      const { data: orders } = await query.limit(100);

      // 过滤敏感信息
      const safeOrders = (orders || []).map(order => ({
        id: order.id,
        symbol: order.symbol,
        symbol_name: order.symbol_name,
        side: order.side,
        price: order.price,
        quantity: order.quantity,
        matched_quantity: order.matched_quantity,
        remaining_quantity: order.quantity - order.matched_quantity,
        amount: order.amount,
        discount_rate: order.discount_rate,
        created_at: order.created_at,
        user_info: {
          username: order.users?.username ? order.users.username.substring(0, 1) + '***' : '匿名'
        }
      }));

      return clientResponse({ orders: safeOrders });
    }
  } catch (error: any) {
    console.error('查询大宗交易错误:', error);
    return clientError(error.message || '查询大宗交易失败');
  }
}
