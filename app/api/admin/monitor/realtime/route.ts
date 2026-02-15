import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/auth';

/**
 * 管理端实时监控API
 * 提供系统实时状态监控和统计数据
 * 
 * GET /api/admin/monitor/realtime - 获取实时监控数据
 * GET /api/admin/monitor/realtime/metrics - 获取具体指标
 * GET /api/admin/monitor/realtime/health - 系统健康检查
 */

// 获取实时监控数据总览
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
    const metrics = searchParams.get('metrics') || 'all'; // users,orders,market,system,all
    const interval = searchParams.get('interval') || '5m'; // 时间间隔

    if (!supabase) {
      return NextResponse.json({ success: false, error: '数据库未配置' }, { status: 500 });
    }

    const metricList = metrics === 'all' ? ['users', 'orders', 'market', 'system'] : metrics.split(',');
    const realtimeData: any = {
      timestamp: new Date().toISOString(),
      interval
    };

    // 并行获取各项指标
    const promises = [];

    if (metricList.includes('users') || metrics === 'all') {
      promises.push(getUserMetrics());
    }
    if (metricList.includes('orders') || metrics === 'all') {
      promises.push(getOrderMetrics());
    }
    if (metricList.includes('market') || metrics === 'all') {
      promises.push(getMarketMetrics());
    }
    if (metricList.includes('system') || metrics === 'all') {
      promises.push(getSystemMetrics());
    }

    const results = await Promise.all(promises);
    
    // 合并结果
    results.forEach(result => {
      Object.assign(realtimeData, result);
    });

    return NextResponse.json({
      success: true,
      data: realtimeData
    });
  } catch (error: any) {
    console.error('实时监控API错误:', error);
    return NextResponse.json({ success: false, error: error.message || '获取监控数据失败' }, { status: 500 });
  }
}

// 获取用户相关指标
async function getUserMetrics() {
  if (!supabase) return {};

  try {
    // 获取在线用户数（最近5分钟活跃）
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { count: onlineUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gte('last_login_at', fiveMinutesAgo);

    // 获取今日新增用户
    const today = new Date().toISOString().split('T')[0];
    const { count: newUsersToday } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);

    // 获取待审核用户数
    const { count: pendingUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // 获取总用户数
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    return {
      users: {
        online: onlineUsers || 0,
        new_today: newUsersToday || 0,
        pending_review: pendingUsers || 0,
        total: totalUsers || 0,
        active_rate: totalUsers && pendingUsers ? Math.round(((totalUsers - pendingUsers) / totalUsers) * 100) : 0
      }
    };
  } catch (error) {
    console.error('用户指标获取错误:', error);
    return {
      users: {
        online: 0,
        new_today: 0,
        pending_review: 0,
        total: 0,
        active_rate: 0,
        error: '获取用户数据失败'
      }
    };
  }
}

// 获取订单相关指标
async function getOrderMetrics() {
  if (!supabase) return {};

  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const today = now.toISOString().split('T')[0];

    // 获取待审核订单数
    const { count: pendingOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // 获取今日订单总数
    const { count: todayOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);

    // 获取近1小时订单数（交易活跃度）
    const { count: recentOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneHourAgo);

    // 获取不同类型订单统计
    const { data: orderTypes } = await supabase
      .from('orders')
      .select('trade_type, status')
      .gte('created_at', `${today}T00:00:00`);

    const typeStats: any = {};
    if (orderTypes) {
      orderTypes.forEach(order => {
        if (!typeStats[order.trade_type]) {
          typeStats[order.trade_type] = { total: 0, pending: 0, approved: 0 };
        }
        typeStats[order.trade_type].total++;
        if (order.status === 'pending') typeStats[order.trade_type].pending++;
        if (order.status === 'approved') typeStats[order.trade_type].approved++;
      });
    }

    return {
      orders: {
        pending: pendingOrders || 0,
        today_total: todayOrders || 0,
        recent_hour: recentOrders || 0,
        by_type: typeStats,
        approval_rate: pendingOrders && todayOrders ? 
          Math.round(((todayOrders - pendingOrders) / todayOrders) * 100) : 0
      }
    };
  } catch (error) {
    console.error('订单指标获取错误:', error);
    return {
      orders: {
        pending: 0,
        today_total: 0,
        recent_hour: 0,
        by_type: {},
        approval_rate: 0,
        error: '获取订单数据失败'
      }
    };
  }
}

// 获取市场相关指标
async function getMarketMetrics() {
  if (!supabase) return {};

  try {
    // 获取股票关注数（模拟数据）
    const { count: watchedStocks } = await supabase
      .from('stock_watchlist')
      .select('*', { count: 'exact', head: true });

    // 获取市场异常事件数
    const { count: marketAlerts } = await supabase
      .from('market_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // 获取热门股票（按查询次数排序，模拟）
    const popularStocks = [
      { symbol: '000001', name: '平安银行', queries: 1247 },
      { symbol: '000002', name: '万科A', queries: 982 },
      { symbol: '600036', name: '招商银行', queries: 856 },
      { symbol: '600030', name: '中信证券', queries: 734 },
      { symbol: '000858', name: '五粮液', queries: 691 }
    ];

    return {
      market: {
        watched_stocks: watchedStocks || 0,
        active_alerts: marketAlerts || 0,
        popular_stocks: popularStocks,
        market_status: 'normal' // 可以根据实际情况判断
      }
    };
  } catch (error) {
    console.error('市场指标获取错误:', error);
    return {
      market: {
        watched_stocks: 0,
        active_alerts: 0,
        popular_stocks: [],
        market_status: 'unknown',
        error: '获取市场数据失败'
      }
    };
  }
}

// 获取系统相关指标
async function getSystemMetrics() {
  if (!supabase) return {};

  try {
    // 获取系统消息未读数
    const { count: unreadMessages } = await supabase
      .from('system_messages')
      .select('*', { count: 'exact', head: true })
      .eq('read', false);

    // 获取待处理任务数（模拟）
    const pendingTasks = 12;

    // 获取系统负载信息（模拟）
    const cpuUsage = Math.round(Math.random() * 30 + 20); // 20-50%
    const memoryUsage = Math.round(Math.random() * 40 + 30); // 30-70%
    const diskUsage = Math.round(Math.random() * 20 + 60); // 60-80%

    // 获取最近错误日志数
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentErrors } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('action_type', 'error')
      .gte('created_at', oneHourAgo);

    return {
      system: {
        unread_messages: unreadMessages || 0,
        pending_tasks: pendingTasks,
        cpu_usage: cpuUsage,
        memory_usage: memoryUsage,
        disk_usage: diskUsage,
        recent_errors: recentErrors || 0,
        status: cpuUsage < 70 && memoryUsage < 80 ? 'healthy' : 'warning'
      }
    };
  } catch (error) {
    console.error('系统指标获取错误:', error);
    return {
      system: {
        unread_messages: 0,
        pending_tasks: 0,
        cpu_usage: 0,
        memory_usage: 0,
        disk_usage: 0,
        recent_errors: 0,
        status: 'error',
        error: '获取系统数据失败'
      }
    };
  }
}

// 健康检查端点
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { check } = body;

    const healthData: any = {
      timestamp: new Date().toISOString(),
      status: 'healthy'
    };

    if (check === 'database') {
      // 数据库连接检查
      if (supabase) {
        try {
          await supabase.from('users').select('id').limit(1);
          healthData.database = 'connected';
        } catch (error) {
          healthData.database = 'disconnected';
          healthData.status = 'unhealthy';
        }
      } else {
        healthData.database = 'not_configured';
        healthData.status = 'unhealthy';
      }
    }

    return NextResponse.json({
      success: true,
      data: healthData
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message || '健康检查失败' 
    }, { status: 500 });
  }
}