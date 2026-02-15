import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/auth';

/**
 * 管理端消息管理API
 * 支持：站内信列表、发送、状态管理
 * 
 * GET /api/admin/messages - 获取消息列表
 * POST /api/admin/messages - 发送消息
 * POST /api/admin/messages/{id}/actions - 执行消息操作
 */

// 获取消息列表
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
    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!supabase) {
      return NextResponse.json({ success: false, error: '数据库未配置' }, { status: 500 });
    }

    let query = supabase
      .from('system_messages')
      .select('*, users(username, real_name)', { count: 'exact' });

    // 筛选条件
    if (type !== 'all') {
      query = query.eq('type', type);
    }
    if (status !== 'all') {
      query = query.eq('read', status === 'read');
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (startDate) {
      query = query.gte('sent_at', startDate);
    }
    if (endDate) {
      query = query.lte('sent_at', endDate);
    }

    const { data: messages, count, error } = await query
      .order('sent_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: messages || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error: any) {
    console.error('消息管理API错误:', error);
    return NextResponse.json({ success: false, error: error.message || '获取消息列表失败' }, { status: 500 });
  }
}

// 发送消息或执行操作
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
    const { action, messageId, data, adminId, adminName } = body;

    if (!supabase) {
      return NextResponse.json({ success: false, error: '数据库未配置' }, { status: 500 });
    }

    // 如果有action参数，则执行操作；否则发送新消息
    if (action && messageId) {
      // 执行消息操作
      let result;
      let auditData: any = {
        admin_id: adminId,
        admin_name: adminName,
        action: `message_${action}`,
        target_type: 'system_message',
        target_id: messageId,
        reason: data?.reason || null,
        created_at: new Date().toISOString()
      };

      switch (action) {
        case 'mark_read':
          // 标记为已读
          result = await supabase
            .from('system_messages')
            .update({
              read: true,
              read_at: new Date().toISOString()
            })
            .eq('id', messageId);

          auditData.description = '标记消息为已读';
          break;

        case 'delete':
          // 删除消息
          result = await supabase
            .from('system_messages')
            .delete()
            .eq('id', messageId);

          auditData.description = '删除消息';
          break;

        case 'resend':
          // 重新发送
          const { data: originalMessage } = await supabase
            .from('system_messages')
            .select('*')
            .eq('id', messageId)
            .single();

          if (!originalMessage) {
            return NextResponse.json({ success: false, error: '消息不存在' }, { status: 404 });
          }

          const newMessage = {
            user_id: originalMessage.user_id,
            type: originalMessage.type,
            title: originalMessage.title,
            content: originalMessage.content,
            sent_by: adminId,
            sent_at: new Date().toISOString(),
            read: false
          };

          result = await supabase
            .from('system_messages')
            .insert([newMessage]);

          auditData.description = '重新发送消息';
          break;

        default:
          return NextResponse.json({ success: false, error: '不支持的操作类型' }, { status: 400 });
      }

      if (result.error) throw result.error;

      // 记录审计日志
      await supabase.from('audit_logs').insert(auditData);

      return NextResponse.json({
        success: true,
        message: `消息操作成功: ${action}`,
        data: { messageId, action }
      });
    } else {
      // 发送新消息
      const { userId, type, title, content, broadcast } = body;
      
      if (!title || !content) {
        return NextResponse.json({ success: false, error: '缺少消息标题或内容' }, { status: 400 });
      }

      if (broadcast) {
        // 广播消息给所有用户
        const { data: users } = await supabase
          .from('users')
          .select('id');

        if (users && users.length > 0) {
          const messages = users.map(user => ({
            user_id: user.id,
            type: type || 'broadcast',
            title,
            content,
            sent_by: adminId,
            sent_at: new Date().toISOString(),
            read: false
          }));

          const { error } = await supabase
            .from('system_messages')
            .insert(messages);

          if (error) throw error;

          // 记录审计日志
          await supabase.from('audit_logs').insert({
            admin_id: adminId,
            admin_name: adminName,
            action: 'send_broadcast',
            target_type: 'system_message',
            target_id: null,
            description: `广播消息: ${title}`,
            reason: content.substring(0, 100),
            created_at: new Date().toISOString()
          });

          return NextResponse.json({
            success: true,
            message: `广播消息发送成功，共发送给${users.length}位用户`,
            data: { count: users.length }
          });
        }
      } else {
        // 发送给特定用户
        if (!userId) {
          return NextResponse.json({ success: false, error: '缺少用户ID' }, { status: 400 });
        }

        const { error } = await supabase.from('system_messages').insert({
          user_id: userId,
          type: type || 'notification',
          title,
          content,
          sent_by: adminId,
          sent_at: new Date().toISOString(),
          read: false
        });

        if (error) throw error;

        // 记录审计日志
        await supabase.from('audit_logs').insert({
          admin_id: adminId,
          admin_name: adminName,
          action: 'send_message',
          target_type: 'system_message',
          target_id: userId,
          description: `发送消息: ${title}`,
          reason: content.substring(0, 100),
          created_at: new Date().toISOString()
        });

        return NextResponse.json({
          success: true,
          message: '消息发送成功',
          data: { userId, title }
        });
      }
    }
  } catch (error: any) {
    console.error('消息管理操作错误:', error);
    return NextResponse.json({ success: false, error: error.message || '消息操作失败' }, { status: 500 });
  }
}