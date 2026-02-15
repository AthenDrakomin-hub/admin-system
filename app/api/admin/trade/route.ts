import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * 统一管理端交易API
 * 支持所有交易类型的审核管理
 * 
 * GET /api/admin/trade?type=a_share&status=pending
 * POST /api/admin/trade - 审核操作
 */

// 获取待审核交易记录
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

    // 检查交易审核权限
    if (!admin.permissions?.canApproveTrades) {
      return NextResponse.json({ success: false, error: '无交易审核权限' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // a_share, hk_share, block, ipo, board, conditional
    const status = searchParams.get('status') || 'pending';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const userId = searchParams.get('userId');

    if (!supabase) {
      return NextResponse.json({ success: false, error: '数据库未配置' }, { status: 500 });
    }

    let result;
    let total = 0;

    // 根据交易类型查询不同的数据表
    switch (type) {
      case 'a_share':
      case 'hk_share':
        // 查询orders表
        let orderQuery = supabase
          .from('orders')
          .select('*, users(username, real_name, phone)', { count: 'exact' })
          .eq('status', status);

        if (type) {
          orderQuery = orderQuery.eq('trade_type', type);
        }

        if (userId) {
          orderQuery = orderQuery.eq('user_id', userId);
        }

        // 分页
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        const { data: orders, count, error: orderError } = await orderQuery
          .order('created_at', { ascending: false })
          .range(from, to);

        if (orderError) throw orderError;

        result = orders || [];
        total = count || 0;
        break;

      case 'block':
        // 查询大宗交易订单
        let blockQuery = supabase
          .from('block_orders')
          .select('*, users(username, real_name, phone)', { count: 'exact' })
          .eq('status', status);

        if (userId) {
          blockQuery = blockQuery.eq('user_id', userId);
        }

        const { data: blockOrders, count: blockCount, error: blockError } = await blockQuery
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (blockError) throw blockError;

        result = blockOrders || [];
        total = blockCount || 0;
        break;

      case 'ipo':
        // 查询IPO申购记录
        let ipoQuery = supabase
          .from('ipo_applications')
          .select('*, users(username, real_name, phone), ipo_stocks(*)', { count: 'exact' })
          .eq('status', status);

        if (userId) {
          ipoQuery = ipoQuery.eq('user_id', userId);
        }

        const { data: ipoApplications, count: ipoCount, error: ipoError } = await ipoQuery
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (ipoError) throw ipoError;

        result = ipoApplications || [];
        total = ipoCount || 0;
        break;

      case 'board':
        // 查询一键打板策略
        let boardQuery = supabase
          .from('board_strategies')
          .select('*, users(username, real_name, phone)', { count: 'exact' })
          .eq('status', status);

        if (userId) {
          boardQuery = boardQuery.eq('user_id', userId);
        }

        const { data: boardStrategies, count: boardCount, error: boardError } = await boardQuery
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (boardError) throw boardError;

        result = boardStrategies || [];
        total = boardCount || 0;
        break;

      case 'conditional':
        // 查询条件单
        let conditionalQuery = supabase
          .from('conditional_orders')
          .select('*, users(username, real_name, phone)', { count: 'exact' })
          .eq('status', status);

        if (userId) {
          conditionalQuery = conditionalQuery.eq('user_id', userId);
        }

        const { data: conditionalOrders, count: conditionalCount, error: conditionalError } = await conditionalQuery
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (conditionalError) throw conditionalError;

        result = conditionalOrders || [];
        total = conditionalCount || 0;
        break;

      case 'abnormal':
        // 查询异常订单（假设orders表中有is_abnormal字段或status为'abnormal'）
        let abnormalQuery = supabase
          .from('orders')
          .select('*, users(username, real_name, phone)', { count: 'exact' })
          .or('status.eq.abnormal,is_abnormal.eq.true');

        if (status !== 'all') {
          abnormalQuery = abnormalQuery.eq('status', status);
        }

        if (userId) {
          abnormalQuery = abnormalQuery.eq('user_id', userId);
        }

        const { data: abnormalOrders, count: abnormalCount, error: abnormalError } = await abnormalQuery
          .order('created_at', { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        if (abnormalError) throw abnormalError;

        result = abnormalOrders || [];
        total = abnormalCount || 0;
        break;

      default:
        // 未指定 type 时返回 orders 表：status=all 为全部状态，否则为待审核
        let allOrdersQuery = supabase
          .from('orders')
          .select('*, users(username, real_name, phone)', { count: 'exact' })
          .order('created_at', { ascending: false });

        if (status !== 'all') {
          allOrdersQuery = allOrdersQuery.eq('status', status || 'pending');
        }
        if (userId) {
          allOrdersQuery = allOrdersQuery.eq('user_id', userId);
        }

        const rangeFrom = (page - 1) * limit;
        const rangeTo = rangeFrom + limit - 1;
        const { data: allOrders, count: allCount, error: allError } = await allOrdersQuery.range(rangeFrom, rangeTo);
        if (allError) throw allError;

        result = allOrders || [];
        total = allCount || 0;
        break;
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
      type: type || 'all'
    });
  } catch (error: any) {
    console.error('管理端交易API错误:', error);
    return NextResponse.json({ success: false, error: error.message || '获取交易记录失败' }, { status: 500 });
  }
}

// 审核交易记录
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
    const { action, targetType, targetId, reason, adminId, adminName } = body;

    if (!action || !targetType || !targetId || !adminId || !adminName) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }

    if (!['approve', 'reject', 'cancel'].includes(action)) {
      return NextResponse.json({ success: false, error: '无效的操作类型' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ success: false, error: '数据库未配置' }, { status: 500 });
    }

    let updateResult;
    let auditData = {
      admin_id: adminId,
      admin_name: adminName,
      action,
      target_type: targetType,
      target_id: targetId,
      reason: reason || null,
      created_at: new Date().toISOString()
    };

    // 根据目标类型执行不同的审核逻辑
    switch (targetType) {
      case 'order': // A股/港股订单
        const status = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'cancelled';
        
        updateResult = await supabase
          .from('orders')
          .update({
            status,
            approved_by: adminId,
            approved_at: new Date().toISOString(),
            reject_reason: action === 'reject' ? reason : null,
            cancel_reason: action === 'cancel' ? reason : null
          })
          .eq('id', targetId);

        // 记录审核日志
        await supabase.from('audit_logs').insert({
          ...auditData,
          action: `order_${action}`,
          description: `订单${action === 'approve' ? '批准' : action === 'reject' ? '驳回' : '取消'}`
        });
        break;

      case 'block_order': // 大宗交易订单
        const blockStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'cancelled';
        
        updateResult = await supabase
          .from('block_orders')
          .update({
            status: blockStatus,
            approved_by: adminId,
            approved_at: new Date().toISOString(),
            reject_reason: action === 'reject' ? reason : null,
            cancel_reason: action === 'cancel' ? reason : null
          })
          .eq('id', targetId);

        await supabase.from('audit_logs').insert({
          ...auditData,
          action: `block_order_${action}`,
          description: `大宗交易订单${action === 'approve' ? '批准' : action === 'reject' ? '驳回' : '取消'}`
        });
        break;

      case 'ipo_application': // IPO申购记录
        const ipoStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'cancelled';
        
        updateResult = await supabase
          .from('ipo_applications')
          .update({
            status: ipoStatus,
            approved_by: adminId,
            approved_at: new Date().toISOString(),
            reject_reason: action === 'reject' ? reason : null,
            cancel_reason: action === 'cancel' ? reason : null
          })
          .eq('id', targetId);

        await supabase.from('audit_logs').insert({
          ...auditData,
          action: `ipo_${action}`,
          description: `IPO申购${action === 'approve' ? '批准' : action === 'reject' ? '驳回' : '取消'}`
        });
        break;

      case 'board_strategy': // 一键打板策略
        const boardStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'cancelled';
        
        updateResult = await supabase
          .from('board_strategies')
          .update({
            status: boardStatus,
            approved_by: adminId,
            approved_at: new Date().toISOString(),
            reject_reason: action === 'reject' ? reason : null,
            cancel_reason: action === 'cancel' ? reason : null,
            manual_required: false // 审核后取消人工审核标记
          })
          .eq('id', targetId);

        await supabase.from('audit_logs').insert({
          ...auditData,
          action: `board_${action}`,
          description: `一键打板策略${action === 'approve' ? '批准' : action === 'reject' ? '驳回' : '取消'}`
        });
        break;

      case 'conditional_order': // 条件单
        const conditionalStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'cancelled';
        
        updateResult = await supabase
          .from('conditional_orders')
          .update({
            status: conditionalStatus,
            approved_by: adminId,
            approved_at: new Date().toISOString(),
            reject_reason: action === 'reject' ? reason : null,
            cancel_reason: action === 'cancel' ? reason : null
          })
          .eq('id', targetId);

        await supabase.from('audit_logs').insert({
          ...auditData,
          action: `conditional_${action}`,
          description: `条件单${action === 'approve' ? '批准' : action === 'reject' ? '驳回' : '取消'}`
        });
        break;

      default:
        return NextResponse.json({ success: false, error: '不支持的目标类型' }, { status: 400 });
    }

    if (updateResult.error) {
      throw updateResult.error;
    }

    return NextResponse.json({
      success: true,
      message: `操作成功: ${action}`,
      data: { targetId, targetType, action }
    });
  } catch (error: any) {
    console.error('管理端交易审核错误:', error);
    return NextResponse.json({ success: false, error: error.message || '审核操作失败' }, { status: 500 });
  }
}
