import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/auth';

/**
 * 管理端邀请码管理API
 * 支持：邀请码列表、生成、状态管理
 * 
 * GET /api/admin/invites - 获取邀请码列表
 * POST /api/admin/invites - 生成邀请码
 * POST /api/admin/invites/{id}/actions - 执行邀请码操作
 */

// 获取邀请码列表
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

    if (!supabase) {
      return NextResponse.json({ success: false, error: '数据库未配置' }, { status: 500 });
    }

    let query = supabase
      .from('invitation_codes')
      .select('*, organizations(name), creator_admins(username)', { count: 'exact' });

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

    const { data: invites, count, error } = await query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: invites || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error: any) {
    console.error('邀请码管理API错误:', error);
    return NextResponse.json({ success: false, error: error.message || '获取邀请码列表失败' }, { status: 500 });
  }
}

// 生成邀请码或执行操作
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
    const { action, inviteId, data, adminId, adminName } = body;

    if (!supabase) {
      return NextResponse.json({ success: false, error: '数据库未配置' }, { status: 500 });
    }

    // 如果有action参数，则执行操作；否则生成新邀请码
    if (action && inviteId) {
      // 执行邀请码操作
      let result;
      let auditData: any = {
        admin_id: adminId,
        admin_name: adminName,
        action: `invite_${action}`,
        target_type: 'invitation_code',
        target_id: inviteId,
        reason: data?.reason || null,
        created_at: new Date().toISOString()
      };

      switch (action) {
        case 'disable':
          // 禁用邀请码
          result = await supabase
            .from('invitation_codes')
            .update({
              status: 'disabled',
              disabled_at: new Date().toISOString(),
              disabled_reason: data?.reason || '管理员禁用'
            })
            .eq('id', inviteId);

          auditData.description = '禁用邀请码';
          break;

        case 'enable':
          // 启用邀请码
          result = await supabase
            .from('invitation_codes')
            .update({
              status: 'active',
              disabled_at: null,
              disabled_reason: null
            })
            .eq('id', inviteId);

          auditData.description = '启用邀请码';
          break;

        case 'extend':
          // 延长有效期
          const { days } = data;
          if (!days) {
            return NextResponse.json({ success: false, error: '缺少延长时间参数' }, { status: 400 });
          }

          const { data: invite } = await supabase
            .from('invitation_codes')
            .select('expires_at')
            .eq('id', inviteId)
            .single();

          if (!invite) {
            return NextResponse.json({ success: false, error: '邀请码不存在' }, { status: 404 });
          }

          const newExpiresAt = new Date(new Date(invite.expires_at).getTime() + days * 24 * 60 * 60 * 1000);
          
          result = await supabase
            .from('invitation_codes')
            .update({
              expires_at: newExpiresAt.toISOString()
            })
            .eq('id', inviteId);

          auditData.description = `延长邀请码有效期${days}天`;
          break;

        default:
          return NextResponse.json({ success: false, error: '不支持的操作类型' }, { status: 400 });
      }

      if (result.error) throw result.error;

      // 记录审计日志
      await supabase.from('audit_logs').insert(auditData);

      return NextResponse.json({
        success: true,
        message: `邀请码操作成功: ${action}`,
        data: { inviteId, action }
      });
    } else {
      // 生成新邀请码
      const { count, organization_id, expires_days, max_uses } = body;
      
      if (!count || !organization_id) {
        return NextResponse.json({ success: false, error: '缺少生成参数' }, { status: 400 });
      }

      const codes = [];
      const expiresAt = new Date(Date.now() + (expires_days || 30) * 24 * 60 * 60 * 1000);

      for (let i = 0; i < count; i++) {
        const code = generateInviteCode(8);
        codes.push({
          code,
          organization_id,
          created_by: adminId,
          expires_at: expiresAt.toISOString(),
          max_uses: max_uses || 1,
          status: 'active'
        });
      }

      const { data: insertedCodes, error } = await supabase
        .from('invitation_codes')
        .insert(codes)
        .select();

      if (error) throw error;

      // 记录审计日志
      await supabase.from('audit_logs').insert({
        admin_id: adminId,
        admin_name: adminName,
        action: 'generate_invites',
        target_type: 'invitation_code',
        target_id: null,
        description: `生成${count}个邀请码`,
        reason: `为机构${organization_id}生成邀请码`,
        created_at: new Date().toISOString()
      });

      return NextResponse.json({
        success: true,
        message: `成功生成${count}个邀请码`,
        data: insertedCodes
      });
    }
  } catch (error: any) {
    console.error('邀请码管理操作错误:', error);
    return NextResponse.json({ success: false, error: error.message || '邀请码操作失败' }, { status: 500 });
  }
}

// 生成随机邀请码
function generateInviteCode(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}