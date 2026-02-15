import { NextRequest } from 'next/server';
import { clientResponse, clientError } from '@/lib/client';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';
import { checkIPOQualification } from '@/lib/trade';

/**
 * IPO申购API
 * GET /api/client/trade/ipo - 获取新股列表
 * POST /api/client/trade/ipo - 申购新股
 * GET /api/client/trade/ipo/records - 查询申购记录
 * DELETE /api/client/trade/ipo - 取消申购
 */

// 获取新股列表
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const type = searchParams.get('type') || 'available'; // available: 可申购, all: 所有
    
    if (!supabase) {
      return clientError('Database not configured');
    }

    let query = supabase
      .from('ipo_stocks')
      .select('*')
      .order('issue_date', { ascending: true });

    if (type === 'available') {
      const today = new Date().toISOString().split('T')[0];
      query = query
        .gte('subscription_start_date', today)
        .lte('subscription_end_date', today);
    }

    const { data: ipoStocks } = await query;

    return clientResponse({ ipo_stocks: ipoStocks || [] });
  } catch (error: any) {
    console.error('获取新股列表错误:', error);
    return clientError(error.message || '获取新股列表失败');
  }
}

// 申购新股
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

    const { ipoId, applyAmount, applyQuantity } = await req.json();
    
    if (!ipoId || (!applyAmount && !applyQuantity)) {
      return clientError('缺少必要参数');
    }

    if (!supabase) {
      return clientError('Database not configured');
    }

    // 获取用户信息
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username, balance_cny, trade_days')
      .eq('username', authUser.username)
      .single();

    if (userError || !user) {
      return clientError('用户不存在', 404);
    }

    // 获取新股信息
    const { data: ipoStock, error: ipoError } = await supabase
      .from('ipo_stocks')
      .select('*')
      .eq('id', ipoId)
      .single();

    if (ipoError || !ipoStock) {
      return clientError('新股不存在', 404);
    }

    // 检查申购时间
    const today = new Date().toISOString().split('T')[0];
    if (today < ipoStock.subscription_start_date || today > ipoStock.subscription_end_date) {
      return clientError('不在申购期内');
    }

    // 计算申购金额
    let finalApplyAmount = applyAmount;
    if (applyQuantity && !applyAmount) {
      finalApplyAmount = applyQuantity * ipoStock.issue_price;
    }

    // 检查申购资格
    const qualification = checkIPOQualification(user.trade_days, user.balance_cny, finalApplyAmount);
    
    if (!qualification.qualified) {
      return clientError(qualification.reason || '不符合申购条件');
    }

    // 检查余额
    if (user.balance_cny < finalApplyAmount) {
      return clientError('CNY余额不足');
    }

    // 创建申购记录
    const { data: application, error: applyError } = await supabase
      .from('ipo_applications')
      .insert({
        user_id: user.id,
        ipo_id: ipoId,
        apply_amount: finalApplyAmount,
        apply_quantity: applyQuantity || Math.floor(finalApplyAmount / ipoStock.issue_price),
        status: 'pending',
        lottery_result: null,
        allocated_quantity: 0,
        refund_amount: 0
      })
      .select()
      .single();

    if (applyError) {
      throw applyError;
    }

    // 冻结申购资金
    const { error: freezeError } = await supabase
      .from('users')
      .update({
        balance_cny: supabase.rpc('decrement', { x: finalApplyAmount }),
        frozen_balance_cny: supabase.rpc('increment', { x: finalApplyAmount })
      })
      .eq('id', user.id);

    if (freezeError) {
      console.error('冻结资金失败:', freezeError);
      // 回滚申购记录
      await supabase.from('ipo_applications').delete().eq('id', application.id);
      throw freezeError;
    }

    return clientResponse({ 
      applicationId: application.id, 
      status: 'pending',
      applyAmount: finalApplyAmount,
      qualification: qualification
    });
  } catch (error: any) {
    console.error('申购新股错误:', error);
    return clientError(error.message || '申购新股失败');
  }
}

// 查询申购记录
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
    const ipoId = searchParams.get('ipoId');
    const status = searchParams.get('status');

    let query = supabase
      .from('ipo_applications')
      .select('*, ipo_stocks(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (ipoId) {
      query = query.eq('ipo_id', ipoId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: applications } = await query.limit(50);

    return clientResponse({ applications: applications || [] });
  } catch (error: any) {
    console.error('查询申购记录错误:', error);
    return clientError(error.message || '查询申购记录失败');
  }
}

// 取消申购
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
    const applicationId = searchParams.get('applicationId');

    if (!applicationId) {
      return clientError('缺少申购记录ID');
    }

    if (!supabase) {
      return clientError('Database not configured');
    }

    // 查询申购记录
    const { data: application, error: appError } = await supabase
      .from('ipo_applications')
      .select('*, ipo_stocks(subscription_end_date)')
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      return clientError('申购记录不存在', 404);
    }

    // 验证申购记录所属用户
    const { data: user } = await supabase
      .from('users')
      .select('username')
      .eq('id', application.user_id)
      .single();

    if (!user || user.username !== authUser.username) {
      return clientError('无权操作此申购记录', 403);
    }

    // 检查申购状态（只有pending状态的申购可以取消）
    if (application.status !== 'pending') {
      return clientError(`申购状态为${application.status}，无法取消`);
    }

    // 检查是否在申购期内（申购期内可以取消）
    const today = new Date().toISOString().split('T')[0];
    const ipoStock = application.ipo_stocks;
    
    if (ipoStock && today > ipoStock.subscription_end_date) {
      return clientError('申购期已结束，无法取消');
    }

    // 更新申购状态为cancelled
    const { error: updateError } = await supabase
      .from('ipo_applications')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: '用户主动取消'
      })
      .eq('id', applicationId);

    if (updateError) {
      throw updateError;
    }

    // 解冻申购资金
    const { error: unfreezeError } = await supabase
      .from('users')
      .update({
        balance_cny: supabase.rpc('increment', { x: application.apply_amount }),
        frozen_balance_cny: supabase.rpc('decrement', { x: application.apply_amount })
      })
      .eq('id', application.user_id);

    if (unfreezeError) {
      console.error('解冻资金失败:', unfreezeError);
    }

    return clientResponse({ success: true, message: '取消申购成功' });
  } catch (error: any) {
    console.error('取消申购错误:', error);
    return clientError(error.message || '取消申购失败');
  }
}
