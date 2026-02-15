import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth, verifyAdminAuth } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!;

/**
 * 统一用户API - 整合客户端和管理端用户服务
 * 支持多种用户操作场景：
 * GET /api/user - 获取用户列表（管理端）
 * GET /api/user?userId=xxx - 获取特定用户信息
 * GET /api/user/profile - 获取当前用户个人信息（客户端）
 * GET /api/user/balance - 获取用户资金信息
 * GET /api/user/positions - 获取用户持仓信息
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action') || 'list';
    
    // 检查是否有认证头（区分客户端和管理端）
    const authHeader = req.headers.get('Authorization');
    let isClientRequest = false;
    let currentUser = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // 先尝试客户端认证
      currentUser = await verifyAuth(token);
      if (!currentUser) {
        // 再尝试管理员认证
        const admin = await verifyAdminAuth(token);
        if (admin) {
          currentUser = { username: admin.username, role: 'admin' };
        }
      } else {
        isClientRequest = true;
      }
    }
    
    switch (action) {
      case 'profile':
        // 获取当前用户个人信息
        if (!currentUser) {
          return NextResponse.json({ 
            success: false, 
            error: '未授权访问' 
          }, { status: 401 });
        }
        
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('id, username, phone, real_name, id_card, status, created_at, balance_cny, balance_hkd, frozen_balance_cny, frozen_balance_hkd, total_deposit, total_withdraw, trade_days')
          .eq('username', currentUser.username)
          .single();
        
        if (profileError || !userProfile) {
          return NextResponse.json({ 
            success: false, 
            error: '用户不存在' 
          }, { status: 404 });
        }
        
        return NextResponse.json({ 
          success: true, 
          data: {
            user: {
              id: userProfile.id,
              username: userProfile.username,
              phone: userProfile.phone,
              real_name: userProfile.real_name,
              id_card: userProfile.id_card,
              status: userProfile.status,
              created_at: userProfile.created_at,
              trade_days: userProfile.trade_days
            },
            balances: {
              cny: {
                available: userProfile.balance_cny,
                frozen: userProfile.frozen_balance_cny,
                total: userProfile.balance_cny + userProfile.frozen_balance_cny
              },
              hkd: {
                available: userProfile.balance_hkd,
                frozen: userProfile.frozen_balance_hkd,
                total: userProfile.balance_hkd + userProfile.frozen_balance_hkd
              },
              total_deposit: userProfile.total_deposit,
              total_withdraw: userProfile.total_withdraw
            }
          }
        });
      
      case 'balance':
        // 获取用户资金信息
        if (!currentUser) {
          return NextResponse.json({ 
            success: false, 
            error: '未授权访问' 
          }, { status: 401 });
        }
        
        const { data: balanceData, error: balanceError } = await supabase
          .from('users')
          .select('balance_cny, balance_hkd, frozen_balance_cny, frozen_balance_hkd, total_deposit, total_withdraw')
          .eq('username', currentUser.username)
          .single();
        
        if (balanceError || !balanceData) {
          return NextResponse.json({ 
            success: false, 
            error: '用户不存在' 
          }, { status: 404 });
        }
        
        return NextResponse.json({ 
          success: true, 
          data: {
            cny: {
              available: balanceData.balance_cny,
              frozen: balanceData.frozen_balance_cny,
              total: balanceData.balance_cny + balanceData.frozen_balance_cny
            },
            hkd: {
              available: balanceData.balance_hkd,
              frozen: balanceData.frozen_balance_hkd,
              total: balanceData.balance_hkd + balanceData.frozen_balance_hkd
            },
            total_deposit: balanceData.total_deposit,
            total_withdraw: balanceData.total_withdraw
          }
        });
      
      case 'positions':
        // 获取用户持仓信息
        if (!currentUser) {
          return NextResponse.json({ 
            success: false, 
            error: '未授权访问' 
          }, { status: 401 });
        }
        
        // 获取用户ID
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('username', currentUser.username)
          .single();
        
        if (!userData) {
          return NextResponse.json({ 
            success: false, 
            error: '用户不存在' 
          }, { status: 404 });
        }
        
        const { data: positions, error: positionsError } = await supabase
          .from('positions')
          .select('*')
          .eq('user_id', userData.id)
          .order('updated_at', { ascending: false });
        
        if (positionsError) throw positionsError;
        
        return NextResponse.json({ 
          success: true, 
          data: positions || [] 
        });
      
      case 'list':
      default:
        // 管理端用户列表功能
        if (userId) {
          // 获取特定用户信息
          const { data: users, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId);
          
          if (error) throw error;
          return NextResponse.json({ success: true, data: users || [] });
        }
        
        // 获取用户列表
        const { data: users, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return NextResponse.json({ success: true, data: users || [] });
    }
  } catch (error: any) {
    console.error('统一用户API错误:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取用户信息失败' },
      { status: 500 }
    );
  }
}

/**
 * 用户操作API
 * POST /api/user - 创建/更新用户
 * POST /api/user?action=adjust_balance - 资金调整
 * POST /api/user?action=freeze - 冻结用户
 * POST /api/user?action=unfreeze - 解冻用户
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const action = body.action || 'save';
    
    switch (action) {
      case 'adjust_balance':
        // 资金调整
        const { userId, amount, currency, reason, adminId, adminName } = body;
        
        const { data: user, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (fetchError || !user) {
          return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
        }
        
        const field = currency === 'CNY' ? 'balance_cny' : 'balance_hkd';
        const currentBalance = user[field] || 0;
        const newBalance = currentBalance + amount;
        
        if (newBalance < 0) {
          return NextResponse.json({ success: false, error: '余额不足' }, { status: 400 });
        }
        
        const { error: updateError } = await supabase
          .from('users')
          .update({ [field]: newBalance })
          .eq('id', userId);
        
        if (updateError) throw updateError;
        
        // 生成流水
        await supabase.from('transaction_flows').insert({
          user_id: userId,
          type: 'adjust',
          amount,
          balance_after: newBalance,
          description: `管理员调整: ${reason}`,
          settled: true,
        });
        
        // 记录审计
        await supabase.from('audit_logs').insert({
          action: '资金调整',
          action_type: 'fund_adjust',
          operator_id: adminId,
          operator_name: adminName,
          target_type: 'user',
          target_id: userId,
          before_data: { [field]: currentBalance },
          after_data: { [field]: newBalance },
          reason,
        });
        
        return NextResponse.json({ success: true, message: '资金调整成功' });
      
      case 'freeze':
        // 冻结用户
        const { freezeUserId, freezeReason, adminId: freezeAdminId, adminName: freezeAdminName } = body;
        
        const { error: freezeError } = await supabase
          .from('users')
          .update({ 
            status: 'frozen',
            frozen_at: new Date().toISOString(),
            frozen_reason: freezeReason
          })
          .eq('id', freezeUserId);
        
        if (freezeError) throw freezeError;
        
        // 记录审计
        await supabase.from('audit_logs').insert({
          action: '冻结用户',
          action_type: 'user_freeze',
          operator_id: freezeAdminId,
          operator_name: freezeAdminName,
          target_type: 'user',
          target_id: freezeUserId,
          reason: freezeReason,
        });
        
        return NextResponse.json({ success: true, message: '用户冻结成功' });
      
      case 'unfreeze':
        // 解冻用户
        const { unfreezeUserId, unfreezeReason, adminId: unfreezeAdminId, adminName: unfreezeAdminName } = body;
        
        const { error: unfreezeError } = await supabase
          .from('users')
          .update({ 
            status: 'active',
            unfrozen_at: new Date().toISOString(),
            unfrozen_reason: unfreezeReason,
            frozen_at: null,
            frozen_reason: null
          })
          .eq('id', unfreezeUserId);
        
        if (unfreezeError) throw unfreezeError;
        
        // 记录审计
        await supabase.from('audit_logs').insert({
          action: '解冻用户',
          action_type: 'user_unfreeze',
          operator_id: unfreezeAdminId,
          operator_name: unfreezeAdminName,
          target_type: 'user',
          target_id: unfreezeUserId,
          reason: unfreezeReason,
        });
        
        return NextResponse.json({ success: true, message: '用户解冻成功' });
      
      case 'save':
      default:
        // 创建/更新用户
        if (body.id) {
          // 更新用户
          const { error } = await supabase
            .from('users')
            .update(body)
            .eq('id', body.id);
          
          if (error) throw error;
        } else {
          // 创建用户
          const { error } = await supabase
            .from('users')
            .insert([body]);
          
          if (error) throw error;
        }
        
        return NextResponse.json({ success: true, message: '操作成功' });
    }
  } catch (error: any) {
    console.error('用户操作API错误:', error);
    return NextResponse.json(
      { success: false, error: error.message || '操作失败' },
      { status: 500 }
    );
  }
}
