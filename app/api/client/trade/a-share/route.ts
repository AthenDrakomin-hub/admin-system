import { NextRequest } from 'next/server';
import { clientResponse, clientError } from '@/lib/client';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

/**
 * A股交易API
 * 扩展现有的order API，提供撤单、成交查询、持仓查询等功能
 */

// 撤单
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return clientError('未授权访问', 401);
    }

    const token = authHeader.substring(7);
    const authUser = await verifyAuth(token);
    if (!authUser) {
      return clientError('无效的认证信息', 401);
    }

    const { orderId } = await req.json();
    if (!orderId) {
      return clientError('缺少订单ID');
    }

    if (!supabase) {
      return clientError('数据库未配置');
    }

    // 检查订单是否存在且属于当前用户
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('user_id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return clientError('订单不存在');
    }

    // TODO: 验证订单属于当前用户（需要用户ID映射）

    // 更新订单状态为已取消
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', orderId);

    if (updateError) {
      return clientError('撤单失败');
    }

    return clientResponse({ success: true, orderId });
  } catch (error: any) {
    console.error('撤单错误:', error);
    return clientError('撤单失败');
  }
}

// 查询成交记录
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return clientError('未授权访问', 401);
    }

    const token = authHeader.substring(7);
    const authUser = await verifyAuth(token);
    if (!authUser) {
      return clientError('无效的认证信息', 401);
    }

    const { searchParams } = req.nextUrl;
    const symbol = searchParams.get('symbol') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!supabase) {
      return clientError('数据库未配置');
    }

    // TODO: 获取当前用户ID（需要用户ID映射）
    const userId = 'temp-user-id';

    let query = supabase
      .from('order_executions')
      .select('*')
      .eq('user_id', userId)
      .order('executed_at', { ascending: false })
      .limit(limit);

    if (symbol) {
      query = query.eq('symbol', symbol);
    }

    if (startDate) {
      query = query.gte('executed_at', startDate);
    }

    if (endDate) {
      query = query.lte('executed_at', endDate);
    }

    const { data: executions, error } = await query;

    if (error) {
      return clientError('查询成交记录失败');
    }

    return clientResponse({ executions: executions || [] });
  } catch (error: any) {
    console.error('查询成交记录错误:', error);
    return clientError('查询成交记录失败');
  }
}

// 查询持仓
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return clientError('未授权访问', 401);
    }

    const token = authHeader.substring(7);
    const authUser = await verifyAuth(token);
    if (!authUser) {
      return clientError('无效的认证信息', 401);
    }

    if (!supabase) {
      return clientError('数据库未配置');
    }

    // TODO: 获取当前用户ID（需要用户ID映射）
    const userId = 'temp-user-id';

    const { data: positions, error } = await supabase
      .from('positions')
      .select('*')
      .eq('user_id', userId)
      .order('symbol', { ascending: true });

    if (error) {
      return clientError('查询持仓失败');
    }

    // 计算持仓盈亏
    const positionsWithPnl = (positions || []).map((position: any) => {
      // TODO: 获取当前行情计算盈亏
      const currentPrice = 0; // 需要从行情API获取
      const marketValue = position.quantity * currentPrice;
      const cost = position.quantity * position.avg_price;
      const pnl = marketValue - cost;
      const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0;

      return {
        ...position,
        current_price: currentPrice,
        market_value: marketValue,
        pnl,
        pnl_percent: pnlPercent
      };
    });

    return clientResponse({ positions: positionsWithPnl });
  } catch (error: any) {
    console.error('查询持仓错误:', error);
    return clientError('查询持仓失败');
  }
}
