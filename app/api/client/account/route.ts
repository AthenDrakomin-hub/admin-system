import { NextRequest } from 'next/server';
import { clientResponse, clientError } from '@/lib/client';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

/**
 * 账户API - 整合用户信息、余额、持仓、流水
 * GET /api/client/account - 获取账户综合信息
 */

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

    // 获取用户基本信息
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, phone, real_name, id_card, status, created_at, balance_cny, balance_hkd, frozen_balance_cny, frozen_balance_hkd, total_deposit, total_withdraw, trade_days')
      .eq('username', authUser.username)
      .single();

    if (userError || !user) {
      return clientError('用户不存在', 404);
    }

    // 获取用户持仓信息
    const { data: positions } = await supabase
      .from('positions')
      .select('id, symbol, symbol_name, quantity, available_quantity, avg_cost, market_value, profit_loss, profit_loss_rate, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    // 获取最近资金流水
    const { data: recentFlows } = await supabase
      .from('transaction_flows')
      .select('id, type, amount, currency, balance_after, description, created_at, settled')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    // 获取待审核订单数量
    const { count: pendingOrdersCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'pending');

    // 计算持仓总市值和总盈亏
    let totalMarketValue = 0;
    let totalProfitLoss = 0;
    let totalCost = 0;

    if (positions && positions.length > 0) {
      positions.forEach(position => {
        totalMarketValue += position.market_value || 0;
        totalProfitLoss += position.profit_loss || 0;
        totalCost += (position.avg_cost || 0) * (position.quantity || 0);
      });
    }

    // 计算账户总资产
    const totalAssetsCNY = user.balance_cny + totalMarketValue;
    const totalAssetsHKD = user.balance_hkd;
    const totalFrozenCNY = user.frozen_balance_cny;
    const totalFrozenHKD = user.frozen_balance_hkd;

    // 构建综合响应
    const accountSummary = {
      user: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        real_name: user.real_name,
        id_card: user.id_card,
        status: user.status,
        created_at: user.created_at,
        trade_days: user.trade_days
      },
      balances: {
        cny: {
          available: user.balance_cny,
          frozen: user.frozen_balance_cny,
          total: user.balance_cny + user.frozen_balance_cny
        },
        hkd: {
          available: user.balance_hkd,
          frozen: user.frozen_balance_hkd,
          total: user.balance_hkd + user.frozen_balance_hkd
        },
        total_deposit: user.total_deposit,
        total_withdraw: user.total_withdraw
      },
      positions: {
        count: positions?.length || 0,
        total_market_value: totalMarketValue,
        total_cost: totalCost,
        total_profit_loss: totalProfitLoss,
        total_profit_loss_rate: totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0,
        items: positions || []
      },
      recent_activity: {
        pending_orders: pendingOrdersCount || 0,
        recent_flows: recentFlows || []
      },
      summary: {
        total_assets_cny: totalAssetsCNY,
        total_assets_hkd: totalAssetsHKD,
        total_frozen_cny: totalFrozenCNY,
        total_frozen_hkd: totalFrozenHKD,
        net_asset_value: totalAssetsCNY + (totalAssetsHKD * 0.92), // 假设汇率0.92
        last_updated: new Date().toISOString()
      }
    };

    return clientResponse(accountSummary);
  } catch (error: any) {
    console.error('账户API错误:', error);
    return clientError(error.message || '获取账户信息失败');
  }
}

/**
 * 获取详细持仓信息
 * GET /api/client/account/positions?symbol=000001
 */
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

    if (!supabase) {
      return clientError('Database not configured');
    }

    const { symbol } = await req.json();

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
      .from('positions')
      .select('*')
      .eq('user_id', user.id);

    if (symbol) {
      query = query.eq('symbol', symbol);
    }

    const { data: positions } = await query.order('updated_at', { ascending: false });

    return clientResponse({ positions: positions || [] });
  } catch (error: any) {
    console.error('获取持仓信息错误:', error);
    return clientError(error.message || '获取持仓信息失败');
  }
}
