import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/auth';

/**
 * 统一管理端功能API
 * 支持：审核中心、邀请码管理、用户管理、站内信管理
 * 
 * GET /api/admin/management?module=audit&status=pending
 * POST /api/admin/management - 执行管理操作
 */

// 获取管理数据
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

    const { searchParams } = new URL(req.url);
    const module = searchParams.get('module'); // audit, invite, user, message
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

    // 根据模块查询不同的数据
    switch (module) {
      case 'audit': // 审核中心 - 待审核用户列表
        // 检查权限
        if (!admin.permissions?.canManageUsers) {
          return NextResponse.json({ success: false, error: '无用户管理权限' }, { status: 403 });
        }

        let auditQuery = supabase
          .from('users')
          .select('*, organizations(name)', { count: 'exact' })
          .eq('status', 'pending');

        // 筛选条件
        if (orgId) {
          auditQuery = auditQuery.eq('organization_id', orgId);
        }
        if (startDate) {
          auditQuery = auditQuery.gte('created_at', startDate);
        }
        if (endDate) {
          auditQuery = auditQuery.lte('created_at', endDate);
        }

        const { data: pendingUsers, count: auditCount, error: auditError } = await auditQuery
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (auditError) throw auditError;

        result = pendingUsers || [];
        total = auditCount || 0;
        break;

      case 'invite': // 邀请码列表
        // 检查权限
        if (!admin.permissions?.canManageUsers) {
          return NextResponse.json({ success: false, error: '无用户管理权限' }, { status: 403 });
        }

        let inviteQuery = supabase
          .from('invitation_codes')
          .select('*, organizations(name)', { count: 'exact' });

        // 筛选条件
        if (status !== 'all') {
          inviteQuery = inviteQuery.eq('status', status);
        }
        if (orgId) {
          inviteQuery = inviteQuery.eq('organization_id', orgId);
        }

        const { data: inviteCodes, count: inviteCount, error: inviteError } = await inviteQuery
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (inviteError) throw inviteError;

        result = inviteCodes || [];
        total = inviteCount || 0;
        break;

      case 'user': // 用户列表
        // 检查权限
        if (!admin.permissions?.canManageUsers) {
          return NextResponse.json({ success: false, error: '无用户管理权限' }, { status: 403 });
        }

        let userQuery = supabase
          .from('users')
          .select('*, organizations(name)', { count: 'exact' });

        // 筛选条件
        if (status !== 'all') {
          userQuery = userQuery.eq('status', status);
        }
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

      case 'message': // 站内信记录
        // 检查权限
        if (!admin.permissions?.canManageUsers) {
          return NextResponse.json({ success: false, error: '无用户管理权限' }, { status: 403 });
        }

        let messageQuery = supabase
          .from('system_messages')
          .select('*, users(username, real_name)', { count: 'exact' });

        // 筛选条件
        if (startDate) {
          messageQuery = messageQuery.gte('sent_at', startDate);
        }
        if (endDate) {
          messageQuery = messageQuery.lte('sent_at', endDate);
        }

        const { data: messages, count: messageCount, error: messageError } = await messageQuery
          .order('sent_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (messageError) throw messageError;

        result = messages || [];
        total = messageCount || 0;
        break;

      default:
        return NextResponse.json({ 
          success: false, 
          error: '无效的模块参数',
          supported_modules: ['audit', 'invite', 'user', 'message']
        }, { status: 400 });
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
      module: module || 'unknown'
    });
  } catch (error: any) {
    console.error('管理端功能API错误:', error);
    return NextResponse.json({ success: false, error: error.message || '获取管理数据失败' }, { status: 500 });
  }
}

// 执行管理操作
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

    const body = await req.json();
    const { action, module, targetId, data, adminId, adminName } = body;

    if (!action || !module || !targetId || !adminId || !adminName) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ success: false, error: '数据库未配置' }, { status: 500 });
    }

    let operationResult;
    let auditData = {
      admin_id: adminId,
      admin_name: adminName,
      action: `${module}_${action}`,
      target_type: module,
      target_id: targetId,
      reason: data?.reason || null,
      description: '',
      created_at: new Date().toISOString()
    };

    // 根据模块和操作执行不同的逻辑
    switch (module) {
      case 'audit': // 用户审核
        if (!admin.permissions?.canManageUsers) {
          return NextResponse.json({ success: false, error: '无用户管理权限' }, { status: 403 });
        }

        if (!['approve', 'reject'].includes(action)) {
          return NextResponse.json({ success: false, error: '无效的审核操作' }, { status: 400 });
        }

        const userStatus = action === 'approve' ? 'active' : 'rejected';
        const auditReason = action === 'reject' ? data?.reason : null;

        // 更新用户状态
        operationResult = await supabase
          .from('users')
          .update({
            status: userStatus,
            reviewed_by: adminId,
            reviewed_at: new Date().toISOString(),
            reject_reason: auditReason
          })
          .eq('id', targetId);

        if (operationResult.error) throw operationResult.error;

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

        // 记录审计日志
        await supabase.from('audit_logs').insert({
          ...auditData,
          description: `用户审核${action === 'approve' ? '通过' : '驳回'}`
        });
        break;

      case 'invite': // 邀请码管理
        if (!admin.permissions?.canManageUsers) {
          return NextResponse.json({ success: false, error: '无用户管理权限' }, { status: 403 });
        }

        if (action === 'generate') {
          // 生成邀请码
          const { count, organization_id, expires_at } = data;
          if (!count || !organization_id) {
            return NextResponse.json({ success: false, error: '缺少生成参数' }, { status: 400 });
          }

          const codes = [];
          for (let i = 0; i < count; i++) {
            const code = generateInviteCode(8);
            codes.push({
              code,
              organization_id,
              created_by: adminId,
              expires_at: expires_at || null,
              status: 'active'
            });
          }

          operationResult = await supabase
            .from('invitation_codes')
            .insert(codes);

          auditData.action = 'invite_generate';
          auditData.description = `批量生成邀请码 ${count}个`;

        } else if (action === 'toggle') {
          // 启用/禁用邀请码
          const { status } = data;
          if (!status) {
            return NextResponse.json({ success: false, error: '缺少状态参数' }, { status: 400 });
          }

          operationResult = await supabase
            .from('invitation_codes')
            .update({ status })
            .eq('id', targetId);

          auditData.action = `invite_${status}`;
          auditData.description = `${status === 'active' ? '启用' : '禁用'}邀请码`;

        } else {
          return NextResponse.json({ success: false, error: '无效的邀请码操作' }, { status: 400 });
        }

        if (operationResult.error) throw operationResult.error;
        await supabase.from('audit_logs').insert(auditData);
        break;

      case 'user': // 用户管理
        if (!admin.permissions?.canManageUsers) {
          return NextResponse.json({ success: false, error: '无用户管理权限' }, { status: 403 });
        }

        if (action === 'reset_password') {
          // 重置密码（简化处理，实际需要更安全的逻辑）
          const newPassword = generateRandomPassword(12);
          // 这里应该加密密码，简化处理
          operationResult = await supabase
            .from('users')
            .update({ 
              password_hash: `temp_${newPassword}`, // 实际应该使用加密
              updated_at: new Date().toISOString()
            })
            .eq('id', targetId);

          auditData.action = 'user_reset_password';
          auditData.description = '重置用户密码';

        } else if (action === 'toggle_status') {
          // 启用/禁用账号
          const { status } = data;
          if (!status) {
            return NextResponse.json({ success: false, error: '缺少状态参数' }, { status: 400 });
          }

          operationResult = await supabase
            .from('users')
            .update({ status })
            .eq('id', targetId);

          auditData.action = `user_${status}`;
          auditData.description = `${status === 'active' ? '启用' : '禁用'}用户账号`;

        } else if (action === 'reaudit') {
          // 重新审核
          operationResult = await supabase
            .from('users')
            .update({ 
              status: 'pending',
              reviewed_by: null,
              reviewed_at: null,
              reject_reason: null
            })
            .eq('id', targetId);

          auditData.action = 'user_reaudit';
          auditData.description = '重新提交用户审核';

        } else {
          return NextResponse.json({ success: false, error: '无效的用户操作' }, { status: 400 });
        }

        if (operationResult.error) throw operationResult.error;
        await supabase.from('audit_logs').insert(auditData);
        break;

      case 'message': // 站内信管理
        if (!admin.permissions?.canManageUsers) {
          return NextResponse.json({ success: false, error: '无用户管理权限' }, { status: 403 });
        }

        if (action === 'send') {
          // 发送站内信
          const { userId, title, content } = data;
          if (!userId || !title || !content) {
            return NextResponse.json({ success: false, error: '缺少消息参数' }, { status: 400 });
          }

          operationResult = await supabase.from('system_messages').insert({
            user_id: userId,
            type: 'system',
            title,
            content,
            sent_by: adminId,
            sent_at: new Date().toISOString(),
            read: false
          });

          auditData.action = 'message_send';
          auditData.description = '发送系统消息';

        } else if (action === 'update_template') {
          // 更新消息模板
          const { templateType, content } = data;
          if (!templateType || !content) {
            return NextResponse.json({ success: false, error: '缺少模板参数' }, { status: 400 });
          }

          operationResult = await supabase
            .from('message_templates')
            .upsert({
              type: templateType,
              content,
              updated_by: adminId,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'type'
            });

          auditData.action = 'message_update_template';
          auditData.description = '更新消息模板';

        } else {
          return NextResponse.json({ success: false, error: '无效的消息操作' }, { status: 400 });
        }

        if (operationResult.error) throw operationResult.error;
        await supabase.from('audit_logs').insert(auditData);
        break;

      default:
        return NextResponse.json({ 
          success: false, 
          error: '无效的模块参数',
          supported_modules: ['audit', 'invite', 'user', 'message']
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `操作成功: ${module}_${action}`,
      data: { targetId, module, action }
    });
  } catch (error: any) {
    console.error('管理端操作错误:', error);
    return NextResponse.json({ success: false, error: error.message || '管理操作失败' }, { status: 500 });
  }
}

// 生成邀请码
function generateInviteCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 生成随机密码
function generateRandomPassword(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
