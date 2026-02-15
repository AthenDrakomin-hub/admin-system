import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/auth';

/**
 * 管理端审核管理API
 * 支持：用户审核、交易审核等
 * 
 * GET /api/admin/audits - 获取待审核列表
 * POST /api/admin/audits/{id}/approve - 审核通过
 * POST /api/admin/audits/{id}/reject - 审核驳回
 */

// 获取待审核列表
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
    const type = searchParams.get('type') || 'user'; // user, trade
    const status = searchParams.get('status') || 'pending';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const orgId = searchParams.get('orgId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!supabase) {
      return NextResponse.json({ success: false, error: '数据库未配置' }, { status: 500 });
    }

    let result;
    let total = 0;

    switch (type) {
      case 'user':
        // 用户审核
        let userQuery = supabase
          .from('users')
          .select('*, organizations(name)', { count: 'exact' })
          .eq('status', status === 'pending' ? 'pending' : status);

        if (orgId) {
          userQuery = userQuery.eq('organization_id', orgId);
        }
        if (startDate) {
          userQuery = userQuery.gte('created_at', startDate);
        }
        if (endDate) {
          userQuery = userQuery.lte('created_at', endDate);
        }

        const { data: users, count: userCount, error: userError } = await userQuery
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (userError) throw userError;

        result = users || [];
        total = userCount || 0;
        break;

      case 'trade':
        // 交易审核
        let tradeQuery = supabase
          .from('orders')
          .select('*, users(username, real_name, phone)', { count: 'exact' })
          .eq('status', status);

        if (startDate) {
          tradeQuery = tradeQuery.gte('created_at', startDate);
        }
        if (endDate) {
          tradeQuery = tradeQuery.lte('created_at', endDate);
        }

        const { data: trades, count: tradeCount, error: tradeError } = await tradeQuery
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (tradeError) throw tradeError;

        result = trades || [];
        total = tradeCount || 0;
        break;

      default:
        return NextResponse.json({ success: false, error: '不支持的审核类型' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      type
    });
  } catch (error: any) {
    console.error('审核管理API错误:', error);
    return NextResponse.json({ success: false, error: error.message || '获取审核列表失败' }, { status: 500 });
  }
}

// 执行审核操作
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
    const { action, targetType, targetId, data, adminId, adminName } = body;

    if (!action || !targetType || !targetId || !adminId || !adminName) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: '无效的审核操作' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ success: false, error: '数据库未配置' }, { status: 500 });
    }

    let result;
    let auditData: any = {
      admin_id: adminId,
      admin_name: adminName,
      action: `${targetType}_${action}`,
      target_type: targetType,
      target_id: targetId,
      reason: data?.reason || null,
      created_at: new Date().toISOString()
    };

    switch (targetType) {
      case 'user':
        // 用户审核
        const userStatus = action === 'approve' ? 'active' : 'rejected';
        const auditReason = action === 'reject' ? data?.reason : null;

        result = await supabase
          .from('users')
          .update({
            status: userStatus,
            reviewed_by: adminId,
            reviewed_at: new Date().toISOString(),
            reject_reason: auditReason
          })
          .eq('id', targetId);

        if (result.error) throw result.error;

        // 发送站内信
        const messageType = action === 'approve' ? 'audit_approved' : 'audit_rejected';
        const messageContent = action === 'approve' 
          ? '您的账号审核已通过，现在可以正常使用系统功能。' 
          : `您的账号审核未通过，原因：${auditReason}`;

        await supabase.from('system_messages').insert({
          user_id: targetId,
          type: messageType,
          title: action === 'approve' ? '审核通过通知' : '审核驳回通知',
          content: messageContent,
          sent_by: adminId,
          sent_at: new Date().toISOString(),
          read: false
        });

        auditData.description = `用户审核${action === 'approve' ? '通过' : '驳回'}`;
        break;

      case 'trade':
        // 交易审核
        const tradeStatus = action === 'approve' ? 'approved' : 'rejected';
        const tradeReason = action === 'reject' ? data?.reason : null;

        result = await supabase
          .from('orders')
          .update({
            status: tradeStatus,
            approved_by: adminId,
            approved_at: new Date().toISOString(),
            reject_reason: tradeReason
          })
          .eq('id', targetId);

        if (result.error) throw result.error;

        auditData.description = `交易审核${action === 'approve' ? '通过' : '驳回'}`;
        break;

      default:
        return NextResponse.json({ success: false, error: '不支持的审核目标类型' }, { status: 400 });
    }

    // 记录审计日志
    await supabase.from('audit_logs').insert(auditData);

    return NextResponse.json({
      success: true,
      message: `审核操作成功: ${action}`,
      data: { targetId, targetType, action }
    });
  } catch (error: any) {
    console.error('审核操作错误:', error);
    return NextResponse.json({ success: false, error: error.message || '审核操作失败' }, { status: 500 });
  }
}