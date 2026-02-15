import { NextRequest } from 'next/server';
import { clientResponse, clientError } from '@/lib/client';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';
import { checkBoardRisk } from '@/lib/trade';

/**
 * 一键打板API
 * POST /api/client/trade/board - 创建打板策略
 * GET /api/client/trade/board - 查询打板策略列表
 * POST /api/client/trade/board/activate - 激活打板策略
 * DELETE /api/client/trade/board - 删除打板策略
 */

// 创建打板策略
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

    const { symbol, symbolName, strategyType, limitUpPrice, quantity, triggerCondition, note } = await req.json();
    
    if (!symbol || !strategyType || !limitUpPrice || !quantity) {
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

    // 获取用户今日已用打板额度
    const today = new Date().toISOString().split('T')[0];
    const { data: todayStrategies } = await supabase
      .from('board_strategies')
      .select('quantity, limit_up_price')
      .eq('user_id', user.id)
      .gte('created_at', today + 'T00:00:00')
      .lte('created_at', today + 'T23:59:59')
      .eq('status', 'activated');

    let userUsedQuota = 0;
    let dailyLimitCount = 0;
    
    if (todayStrategies && todayStrategies.length > 0) {
      todayStrategies.forEach(strategy => {
        userUsedQuota += (strategy.limit_up_price || 0) * (strategy.quantity || 0);
      });
      dailyLimitCount = todayStrategies.length;
    }

    // 风控检查
    const riskCheck = checkBoardRisk(limitUpPrice, quantity, userUsedQuota, dailyLimitCount);
    
    if (!riskCheck.approved) {
      return clientError(riskCheck.reason || '风控检查未通过');
    }

    const orderAmount = limitUpPrice * quantity;
    
    // 检查余额
    if (user.balance_cny < orderAmount) {
      return clientError('CNY余额不足');
    }

    // 创建打板策略
    const { data: strategy, error: strategyError } = await supabase
      .from('board_strategies')
      .insert({
        user_id: user.id,
        symbol,
        symbol_name: symbolName || symbol,
        strategy_type: strategyType,
        limit_up_price: limitUpPrice,
        quantity,
        order_amount: orderAmount,
        trigger_condition: triggerCondition || 'limit_up',
        status: 'created',
        risk_check: riskCheck,
        note: note || '',
        manual_required: riskCheck.manualRequired
      })
      .select()
      .single();

    if (strategyError) {
      throw strategyError;
    }

    // 如果是自动通过且不需要人工审核，直接冻结资金
    if (riskCheck.approved && !riskCheck.manualRequired) {
      const { error: freezeError } = await supabase
        .from('users')
        .update({
          balance_cny: supabase.rpc('decrement', { x: orderAmount }),
          frozen_balance_cny: supabase.rpc('increment', { x: orderAmount })
        })
        .eq('id', user.id);

      if (freezeError) {
        console.error('冻结资金失败:', freezeError);
        // 回滚策略创建
        await supabase.from('board_strategies').delete().eq('id', strategy.id);
        throw freezeError;
      }

      // 更新策略状态为已激活
      await supabase
        .from('board_strategies')
        .update({ status: 'activated', activated_at: new Date().toISOString() })
        .eq('id', strategy.id);
    }

    return clientResponse({ 
      strategyId: strategy.id, 
      status: riskCheck.manualRequired ? 'pending_approval' : 'activated',
      orderAmount,
      riskCheck: riskCheck
    });
  } catch (error: any) {
    console.error('创建打板策略错误:', error);
    return clientError(error.message || '创建打板策略失败');
  }
}

// 查询打板策略列表
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
    const strategyType = searchParams.get('strategyType');

    let query = supabase
      .from('board_strategies')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (strategyType) {
      query = query.eq('strategy_type', strategyType);
    }

    const { data: strategies } = await query.limit(50);

    return clientResponse({ strategies: strategies || [] });
  } catch (error: any) {
    console.error('查询打板策略错误:', error);
    return clientError(error.message || '查询打板策略失败');
  }
}

// 激活打板策略（用于人工审核通过后）
export async function PUT(req: NextRequest) {
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

    // 获取用户完整信息
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, balance_cny')
      .eq('username', authUser.username)
      .single();

    if (userError || !user) {
      return clientError('用户不存在', 404);
    }

    const { strategyId } = await req.json();
    
    if (!strategyId) {
      return clientError('缺少策略ID');
    }

    // 查询策略信息
    const { data: strategy, error: strategyError } = await supabase
      .from('board_strategies')
      .select('*, users(balance_cny)')
      .eq('id', strategyId)
      .single();

    if (strategyError || !strategy) {
      return clientError('打板策略不存在', 404);
    }

    // 验证策略所属用户
    if (strategy.user_id !== user.id) {
      return clientError('无权操作此策略', 403);
    }

    // 检查策略状态
    if (strategy.status !== 'created' && strategy.status !== 'pending_approval') {
      return clientError(`策略状态为${strategy.status}，无法激活`);
    }

    // 检查余额
    const userBalance = strategy.users?.balance_cny || 0;
    if (userBalance < strategy.order_amount) {
      return clientError('CNY余额不足');
    }

    // 冻结资金
    const { error: freezeError } = await supabase
      .from('users')
      .update({
        balance_cny: supabase.rpc('decrement', { x: strategy.order_amount }),
        frozen_balance_cny: supabase.rpc('increment', { x: strategy.order_amount })
      })
      .eq('id', strategy.user_id);

    if (freezeError) {
      throw freezeError;
    }

    // 更新策略状态为已激活
    const { error: updateError } = await supabase
      .from('board_strategies')
      .update({
        status: 'activated',
        activated_at: new Date().toISOString(),
        manual_required: false
      })
      .eq('id', strategyId);

    if (updateError) {
      throw updateError;
    }

    return clientResponse({ 
      success: true, 
      message: '打板策略激活成功',
      strategyId: strategy.id
    });
  } catch (error: any) {
    console.error('激活打板策略错误:', error);
    return clientError(error.message || '激活打板策略失败');
  }
}

// 删除/取消打板策略
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
    const strategyId = searchParams.get('strategyId');

    if (!strategyId) {
      return clientError('缺少策略ID');
    }

    if (!supabase) {
      return clientError('Database not configured');
    }

    // 查询策略信息
    const { data: strategy, error: strategyError } = await supabase
      .from('board_strategies')
      .select('*')
      .eq('id', strategyId)
      .single();

    if (strategyError || !strategy) {
      return clientError('打板策略不存在', 404);
    }

    // 验证策略所属用户
    const { data: user } = await supabase
      .from('users')
      .select('username')
      .eq('id', strategy.user_id)
      .single();

    if (!user || user.username !== authUser.username) {
      return clientError('无权操作此策略', 403);
    }

    // 检查策略状态（只有created/pending_approval状态的策略可以删除）
    if (strategy.status === 'activated' || strategy.status === 'executed' || strategy.status === 'cancelled') {
      return clientError(`策略状态为${strategy.status}，无法删除`);
    }

    // 删除策略
    const { error: deleteError } = await supabase
      .from('board_strategies')
      .delete()
      .eq('id', strategyId);

    if (deleteError) {
      throw deleteError;
    }

    // 如果已冻结资金，解冻资金
    if (strategy.status === 'activated') {
      const { error: unfreezeError } = await supabase
        .from('users')
        .update({
          balance_cny: supabase.rpc('increment', { x: strategy.order_amount }),
          frozen_balance_cny: supabase.rpc('decrement', { x: strategy.order_amount })
        })
        .eq('id', strategy.user_id);

      if (unfreezeError) {
        console.error('解冻资金失败:', unfreezeError);
      }
    }

    return clientResponse({ success: true, message: '打板策略删除成功' });
  } catch (error: any) {
    console.error('删除打板策略错误:', error);
    return clientError(error.message || '删除打板策略失败');
  }
}
