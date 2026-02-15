import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/auth';

/**
 * 管理端用户管理API
 * 支持：用户列表、用户详情、用户状态管理
 * 
 * GET /api/admin/users - 获取用户列表
 * GET /api/admin/users/{id} - 获取用户详情
 * POST /api/admin/users/{id}/actions - 执行用户操作
 */

// 获取用户列表或特定用户
export async function GET(req: NextRequest) {
  try {
    // 验证管理员身份
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: '未授权访问' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const admin = await verifyAdminAuth(token);

    if (!admin) {
      return NextResponse.json({ success: false, error: '无效的管理员认证' }, { status: 401 });
    }

    // 检查权限
    if (!admin.permissions?.canManageUsers) {
      return NextResponse.json({ success: false, error: '无用户管理权限' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const orgId = searchParams.get('orgId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search'); // 搜索用户名或真实姓名

    if (!supabase) {
      return NextResponse.json({ success: false, error: '数据库未配置' }, { status: 500 });
    }

    let query = supabase
      .from('users')
      .select('*, organizations(name)', { count: 'exact' });

    // 筛选条件
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    if (orgId) {
      query = query.eq('organization_id', orgId);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (search) {
      query = query.or(`username.ilike.%${search}%,real_name.ilike.%${search}%`);
    }

    const { data: users, count, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: users || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error: any) {
    console.error('用户管理API错误:', error);
    return NextResponse.json({ success: false, error: error.message || '获取用户列表失败' }, { status: 500 });
  }
}

// 执行用户管理操作
export async function POST(req: NextRequest) {
  try {
    // 验证管理员身份
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: '未授权访问' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const admin = await verifyAdminAuth(token);

    if (!admin) {
      return NextResponse.json({ success: false, error: '无效的管理员认证' }, { status: 401 });
    }

    // 检查权限
    if (!admin.permissions?.canManageUsers) {
      return NextResponse.json({ success: false, error: '无用户管理权限' }, { status: 403 });
    }

    const body = await req.json();
    const { action, userId, data } = body;

    if (!action) {
      return NextResponse.json({ success: false, error: '缺少操作类型' }, { status: 400 });
    }
    
    // 对于创建操作，不需要userId
    if (action !== 'create' && !userId) {
      return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ success: false, error: '数据库未配置' }, { status: 500 });
    }

    let result;
    let newUserId = null;
    let auditData: any = {
      admin_id: admin.id,
      admin_name: admin.username,
      action: `user_${action}`,
      target_type: 'user',
      target_id: userId,
      reason: data?.reason || null,
      created_at: new Date().toISOString()
    };

    switch (action) {
      case 'freeze':
        // 冻结用户
        result = await supabase
          .from('users')
          .update({
            status: 'frozen',
            frozen_at: new Date().toISOString(),
            frozen_reason: data?.reason || '管理员冻结'
          })
          .eq('id', userId);

        auditData.description = '冻结用户账户';
        break;

      case 'unfreeze':
        // 解冻用户
        result = await supabase
          .from('users')
          .update({
            status: 'active',
            unfrozen_at: new Date().toISOString(),
            unfrozen_reason: data?.reason || '管理员解冻',
            frozen_at: null,
            frozen_reason: null
          })
          .eq('id', userId);

        auditData.description = '解冻用户账户';
        break;

      case 'reset_password':
        // 重置密码
        const bcrypt = require('bcryptjs');
        const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || '123456';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        
        result = await supabase
          .from('users')
          .update({
            password_hash: hashedPassword,
            password_reset_at: new Date().toISOString()
          })
          .eq('id', userId);

        auditData.description = '重置用户密码';
        break;

      case 'adjust_balance':
        // 调整资金
        const { amount, currency } = data;
        if (!amount || !currency) {
          return NextResponse.json({ success: false, error: '缺少资金调整参数' }, { status: 400 });
        }

        const field = currency === 'CNY' ? 'balance_cny' : 'balance_hkd';
        
        // 获取当前余额
        const { data: user } = await supabase
          .from('users')
          .select(field)
          .eq('id', userId)
          .single();

        if (!user) {
          return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
        }

        const currentBalance = (user as any)[field] || 0;
        const newBalance = currentBalance + parseFloat(amount);

        if (newBalance < 0) {
          return NextResponse.json({ success: false, error: '余额不足' }, { status: 400 });
        }

        result = await supabase
          .from('users')
          .update({ [field]: newBalance })
          .eq('id', userId);

        // 生成流水记录
        await supabase.from('transaction_flows').insert({
          user_id: userId,
          type: 'adjust',
          amount: parseFloat(amount),
          currency,
          balance_after: newBalance,
          description: `管理员调整: ${data.reason || '资金调整'}`,
          settled: true,
          created_at: new Date().toISOString()
        });

        auditData.description = `调整用户${currency}资金: ${amount > 0 ? '+' : ''}${amount}`;
        break;

      case 'create':
        // 创建新用户
        const { data: userData } = body;
        
        if (!userData || !userData.username || !userData.password) {
          return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
        }
        
        // 检查用户名是否已存在
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('username', userData.username)
          .single();
        
        if (existingUser) {
          return NextResponse.json({ success: false, error: '用户名已存在' }, { status: 400 });
        }
        
        // 加密密码
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        // 准备用户数据
        const newUser = {
          username: userData.username,
          real_name: userData.real_name || '',
          phone: userData.phone || '',
          email: userData.email || null,
          id_card: userData.id_card || null,
          password_hash: hashedPassword,
          organization_id: userData.organization_id || null,
          status: userData.status || 'pending',
          created_at: new Date().toISOString()
        };
        
        // 创建用户
        result = await supabase
          .from('users')
          .insert([newUser]);
        
        auditData.description = '创建新用户';
        newUserId = result.data?.[0]?.id || null;
        auditData.target_id = newUserId;
        break;
        
      default:
        return NextResponse.json({ success: false, error: '不支持的操作类型' }, { status: 400 });
    }

    if (result.error) throw result.error;

    // 记录审计日志
    await supabase.from('audit_logs').insert(auditData);

    return NextResponse.json({
      success: true,
      message: `用户操作成功: ${action}`,
      data: { 
        userId: action === 'create' ? newUserId : userId, 
        action 
      }
    });
  } catch (error: any) {
    console.error('用户管理操作错误:', error);
    return NextResponse.json({ success: false, error: error.message || '用户操作失败' }, { status: 500 });
  }
}