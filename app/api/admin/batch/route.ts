import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/auth';

/**
 * 管理端批量操作API
 * 支持批量用户管理、订单处理、消息发送等操作
 * 
 * POST /api/admin/batch/users - 批量用户操作
 * POST /api/admin/batch/orders - 批量订单操作
 * POST /api/admin/batch/messages - 批量消息操作
 */

// 批量操作主入口
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
    const { resource, action, ids, filters, data, adminId, adminName } = body;

    if (!resource || !action || !adminId || !adminName) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ success: false, error: '数据库未配置' }, { status: 500 });
    }

    let result;
    let auditDescription = '';

    switch (resource) {
      case 'users':
        result = await batchUserOperations(action, ids, filters, data, adminId, adminName);
        auditDescription = `批量用户操作: ${action}`;
        break;
      
      case 'orders':
        result = await batchOrderOperations(action, ids, filters, data, adminId, adminName);
        auditDescription = `批量订单操作: ${action}`;
        break;
      
      case 'messages':
        result = await batchMessageOperations(action, ids, filters, data, adminId, adminName);
        auditDescription = `批量消息操作: ${action}`;
        break;
      
      default:
        return NextResponse.json({ success: false, error: '不支持的资源类型' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    // 记录批量操作审计日志
    await supabase.from('audit_logs').insert({
      admin_id: adminId,
      admin_name: adminName,
      action: `batch_${resource}_${action}`,
      target_type: resource,
      target_id: null,
      description: auditDescription,
      reason: `批量处理${result.processed}个项目`,
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: `批量操作成功: ${action}`,
      data: {
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
        details: result.details
      }
    });
  } catch (error: any) {
    console.error('批量操作API错误:', error);
    return NextResponse.json({ success: false, error: error.message || '批量操作失败' }, { status: 500 });
  }
}

// 批量用户操作
async function batchUserOperations(
  action: string, 
  ids: string[], 
  filters: any, 
  data: any, 
  adminId: string, 
  adminName: string
) {
  // 空值检查
  if (!supabase) {
    throw new Error('数据库未配置');
  }
  
  try {
    let targetUsers: string[] = [];

    // 获取目标用户ID列表
    if (ids && ids.length > 0) {
      targetUsers = ids;
    } else if (filters) {
      // 根据筛选条件获取用户
      let query = supabase!.from('users').select('id');
      
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.orgId) {
        query = query.eq('organization_id', filters.orgId);
      }
      if (filters.createdBefore) {
        query = query.lte('created_at', filters.createdBefore);
      }
      if (filters.createdAfter) {
        query = query.gte('created_at', filters.createdAfter);
      }

      const { data: users } = await query;
      targetUsers = users?.map(u => u.id) || [];
    }

    if (targetUsers.length === 0) {
      return { success: false, error: '未找到符合条件的用户' };
    }

    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    const details: any[] = [];

    // 执行批量操作
    for (const userId of targetUsers) {
      try {
        let result;
        let operationDesc = '';

        switch (action) {
          case 'suspend':
            result = await supabase
              .from('users')
              .update({
                status: 'suspended',
                suspended_at: new Date().toISOString(),
                suspended_reason: data?.reason || '批量暂停'
              })
              .eq('id', userId);
            operationDesc = '暂停账户';
            break;

          case 'activate':
            result = await supabase
              .from('users')
              .update({
                status: 'active',
                activated_at: new Date().toISOString()
              })
              .eq('id', userId);
            operationDesc = '激活账户';
            break;

          case 'reset_password':
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
            operationDesc = '重置密码';
            break;

          case 'adjust_balance':
            if (!data?.amount || !data?.currency) {
              throw new Error('缺少资金调整参数');
            }

            const field = data.currency === 'CNY' ? 'balance_cny' : 'balance_hkd';
            const adjustment = parseFloat(data.amount);

            // 获取当前余额
            const { data: user } = await supabase
              .from('users')
              .select(field)
              .eq('id', userId)
              .single();

            if (user) {
              const currentBalance = (user as any)[field] || 0;
              const newBalance = currentBalance + adjustment;

              if (newBalance >= 0) {
                result = await supabase
                  .from('users')
                  .update({ [field]: newBalance })
                  .eq('id', userId);

                // 生成流水记录
                await supabase.from('transaction_flows').insert({
                  user_id: userId,
                  type: 'adjust',
                  amount: adjustment,
                  currency: data.currency,
                  balance_after: newBalance,
                  description: `批量调整: ${data.reason || '资金调整'}`,
                  settled: true,
                  created_at: new Date().toISOString()
                });
                operationDesc = `调整${data.currency}资金: ${adjustment > 0 ? '+' : ''}${adjustment}`;
              } else {
                throw new Error('余额不足');
              }
            }
            break;

          case 'send_message':
            if (!data?.title || !data?.content) {
              throw new Error('缺少消息内容');
            }

            result = await supabase.from('system_messages').insert({
              user_id: userId,
              type: data.type || 'notification',
              title: data.title,
              content: data.content,
              sent_by: adminId,
              sent_at: new Date().toISOString(),
              read: false
            });
            operationDesc = `发送消息: ${data.title}`;
            break;

          default:
            throw new Error(`不支持的操作: ${action}`);
        }

        if (result?.error) {
          throw result.error;
        }

        succeeded++;
        details.push({ userId, status: 'success', operation: operationDesc });
      } catch (error: any) {
        failed++;
        details.push({ userId, status: 'failed', error: error.message });
      }
      processed++;
    }

    return { success: true, processed, succeeded, failed, details };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 批量订单操作
async function batchOrderOperations(
  action: string, 
  ids: string[], 
  filters: any, 
  data: any, 
  adminId: string, 
  adminName: string
) {
  // 空值检查
  if (!supabase) {
    throw new Error('数据库未配置');
  }
  
  try {
    let targetOrders: string[] = [];

    // 获取目标订单ID列表
    if (ids && ids.length > 0) {
      targetOrders = ids;
    } else if (filters) {
      // 根据筛选条件获取订单
      let query = supabase.from('orders').select('id');
      
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.tradeType) {
        query = query.eq('trade_type', filters.tradeType);
      }
      if (filters.createdBefore) {
        query = query.lte('created_at', filters.createdBefore);
      }
      if (filters.createdAfter) {
        query = query.gte('created_at', filters.createdAfter);
      }

      const { data: orders } = await query;
      targetOrders = orders?.map(o => o.id) || [];
    }

    if (targetOrders.length === 0) {
      return { success: false, error: '未找到符合条件的订单' };
    }

    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    const details: any[] = [];

    // 执行批量操作
    for (const orderId of targetOrders) {
      try {
        let result;
        let operationDesc = '';

        switch (action) {
          case 'approve':
            result = await supabase
              .from('orders')
              .update({
                status: 'approved',
                approved_by: adminId,
                approved_at: new Date().toISOString()
              })
              .eq('id', orderId);
            operationDesc = '批准订单';
            break;

          case 'reject':
            if (!data?.reason) {
              throw new Error('缺少驳回原因');
            }
            result = await supabase
              .from('orders')
              .update({
                status: 'rejected',
                approved_by: adminId,
                approved_at: new Date().toISOString(),
                reject_reason: data.reason
              })
              .eq('id', orderId);
            operationDesc = `驳回订单: ${data.reason}`;
            break;

          case 'cancel':
            if (!data?.reason) {
              throw new Error('缺少取消原因');
            }
            result = await supabase
              .from('orders')
              .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                cancel_reason: data.reason
              })
              .eq('id', orderId);
            operationDesc = `取消订单: ${data.reason}`;
            break;

          default:
            throw new Error(`不支持的操作: ${action}`);
        }

        if (result?.error) {
          throw result.error;
        }

        succeeded++;
        details.push({ orderId, status: 'success', operation: operationDesc });
      } catch (error: any) {
        failed++;
        details.push({ orderId, status: 'failed', error: error.message });
      }
      processed++;
    }

    return { success: true, processed, succeeded, failed, details };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 批量消息操作
async function batchMessageOperations(
  action: string, 
  ids: string[], 
  filters: any, 
  data: any, 
  adminId: string, 
  adminName: string
) {
  // 空值检查
  if (!supabase) {
    throw new Error('数据库未配置');
  }
  
  try {
    let targetMessages: string[] = [];

    // 获取目标消息ID列表
    if (ids && ids.length > 0) {
      targetMessages = ids;
    } else if (filters) {
      // 根据筛选条件获取消息
      let query = supabase.from('system_messages').select('id');
      
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.read !== undefined) {
        query = query.eq('read', filters.read);
      }
      if (filters.sentBefore) {
        query = query.lte('sent_at', filters.sentBefore);
      }
      if (filters.sentAfter) {
        query = query.gte('sent_at', filters.sentAfter);
      }

      const { data: messages } = await query;
      targetMessages = messages?.map(m => m.id) || [];
    }

    if (targetMessages.length === 0) {
      return { success: false, error: '未找到符合条件的消息' };
    }

    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    const details: any[] = [];

    // 执行批量操作
    for (const messageId of targetMessages) {
      try {
        let result;
        let operationDesc = '';

        switch (action) {
          case 'mark_read':
            result = await supabase
              .from('system_messages')
              .update({
                read: true,
                read_at: new Date().toISOString()
              })
              .eq('id', messageId);
            operationDesc = '标记为已读';
            break;

          case 'mark_unread':
            result = await supabase
              .from('system_messages')
              .update({
                read: false,
                read_at: null
              })
              .eq('id', messageId);
            operationDesc = '标记为未读';
            break;

          case 'delete':
            result = await supabase
              .from('system_messages')
              .delete()
              .eq('id', messageId);
            operationDesc = '删除消息';
            break;

          default:
            throw new Error(`不支持的操作: ${action}`);
        }

        if (result?.error) {
          throw result.error;
        }

        succeeded++;
        details.push({ messageId, status: 'success', operation: operationDesc });
      } catch (error: any) {
        failed++;
        details.push({ messageId, status: 'failed', error: error.message });
      }
      processed++;
    }

    return { success: true, processed, succeeded, failed, details };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}