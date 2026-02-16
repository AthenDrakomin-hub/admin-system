import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
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
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const admin = await verifyAdminAuth(token);

    if (!admin) {
      return NextResponse.json(
        { success: false, error: '无效的管理员认证' },
        { status: 401 }
      );
    }

    // 检查权限
    if (!admin.permissions?.canManageUsers) {
      return NextResponse.json(
        { success: false, error: '无用户管理权限' },
        { status: 403 }
      );
    }

    // 创建带RLS上下文的管理员客户端
    const adminClient = await createAdminClient(admin.username);
    
    // 查询用户列表（关联机构表，解决组织权限问题）
    const { data: users, error } = await adminClient
      .from('users')
      .select(`
        id,
        username,
        real_name,
        phone,
        email,
        balance_cny,
        balance_hkd,
        status,
        organization_id,
        created_at,
        updated_at,
        organizations:organization_id (id, name, code) // 关联机构信息
      `)
      .order('created_at', { ascending: false });

    // 捕获查询错误
    if (error) {
      console.error('查询用户列表失败:', error.message);
      return NextResponse.json(
        { success: false, error: `查询用户失败: ${error.message}` },
        { status: 500 }
      );
    }

    // 返回成功结果
    return NextResponse.json({
      success: true,
      data: users || [],
      total: users?.length || 0,
    });
  } catch (err) {
    // 全局异常捕获（关键！解决500错误）
    console.error('GET /api/admin/users 异常:', err);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
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

    // 创建带RLS上下文的管理员客户端
    const adminClient = await createAdminClient(admin.username);
    
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
        result = await adminClient
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
        result = await adminClient
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
        const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || '123456';
        const resetPasswordHash = await bcrypt.hash(defaultPassword, 10);
        
        result = await adminClient
          .from('users')
          .update({
            password_hash: resetPasswordHash,
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
        const { data: user } = await adminClient
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

        result = await adminClient
          .from('users')
          .update({ [field]: newBalance })
          .eq('id', userId);

        // 生成流水记录
        await adminClient.from('transaction_flows').insert({
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
        const { data: existingUser } = await adminClient
          .from('users')
          .select('id')
          .eq('username', userData.username)
          .single();
        
        if (existingUser) {
          return NextResponse.json({ success: false, error: '用户名已存在' }, { status: 400 });
        }
        
        // 加密密码（使用不同的变量名，避免重复定义）
        const newUserPasswordHash = await bcrypt.hash(userData.password, 10);
        
        // 准备用户数据
        const newUser = {
          username: userData.username,
          real_name: userData.real_name || '',
          phone: userData.phone || '',
          email: userData.email || null,
          id_card: userData.id_card || null,
          password_hash: newUserPasswordHash,
          organization_id: userData.organization_id || null,
          status: userData.status || 'pending',
          created_at: new Date().toISOString()
        };
        
        // 创建用户
        result = await adminClient
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

    // 记录审计日志（现在有RLS上下文，可以正常插入）
    await adminClient.from('audit_logs').insert(auditData);

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