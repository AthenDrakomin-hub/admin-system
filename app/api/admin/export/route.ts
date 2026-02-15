import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/auth';

/**
 * 管理端数据导出API
 * 支持多种格式的数据导出功能
 * 
 * GET /api/admin/export/users - 导出用户数据
 * GET /api/admin/export/orders - 导出订单数据
 * GET /api/admin/export/finance - 导出财务数据
 * GET /api/admin/export/trades - 导出交易数据
 */

// 数据导出主入口
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
    const resource = searchParams.get('resource'); // users, orders, finance, trades
    const format = searchParams.get('format') || 'json'; // json, csv, xlsx
    const dateRange = searchParams.get('date_range') || '30d';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!resource) {
      return NextResponse.json({ success: false, error: '缺少资源类型参数' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ success: false, error: '数据库未配置' }, { status: 500 });
    }

    // 计算日期范围
    let fromDate, toDate;
    if (startDate && endDate) {
      fromDate = startDate;
      toDate = endDate;
    } else {
      const days = parseInt(dateRange.replace('d', '')) || 30;
      toDate = new Date().toISOString();
      fromDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    }

    let exportData: any = {};
    let filename = '';

    // 根据资源类型获取数据
    switch (resource) {
      case 'users':
        exportData = await exportUsersData(fromDate, toDate);
        filename = `users_export_${new Date().toISOString().split('T')[0]}.${format}`;
        break;
      
      case 'orders':
        const orderType = searchParams.get('type') || 'all';
        exportData = await exportOrdersData(fromDate, toDate, orderType);
        filename = `orders_export_${new Date().toISOString().split('T')[0]}.${format}`;
        break;
      
      case 'finance':
        const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
        exportData = await exportFinanceData(month);
        filename = `finance_export_${month}.${format}`;
        break;
      
      case 'trades':
        const tradeType = searchParams.get('trade_type') || 'all';
        exportData = await exportTradesData(fromDate, toDate, tradeType);
        filename = `trades_export_${new Date().toISOString().split('T')[0]}.${format}`;
        break;
      
      default:
        return NextResponse.json({ success: false, error: '不支持的资源类型' }, { status: 400 });
    }

    // 格式化数据
    let formattedData;
    switch (format) {
      case 'csv':
        formattedData = convertToCSV(exportData.data);
        break;
      case 'xlsx':
        // XLSX格式需要额外处理，这里返回JSON
        formattedData = JSON.stringify(exportData);
        break;
      case 'json':
      default:
        formattedData = JSON.stringify(exportData, null, 2);
        break;
    }

    // 设置响应头
    const headers = new Headers();
    headers.set('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);

    // 记录导出审计日志
    await supabase.from('audit_logs').insert({
      admin_id: admin.username,
      admin_name: admin.username,
      action: `export_${resource}`,
      target_type: resource,
      target_id: null,
      description: `导出${resource}数据`,
      reason: `格式:${format}, 日期范围:${fromDate}至${toDate}`,
      created_at: new Date().toISOString()
    });

    return new NextResponse(formattedData, {
      status: 200,
      headers
    });
  } catch (error: any) {
    console.error('数据导出API错误:', error);
    return NextResponse.json({ success: false, error: error.message || '数据导出失败' }, { status: 500 });
  }
}

// 导出用户数据
async function exportUsersData(startDate: string, endDate: string) {
  try {
    if (!supabase) throw new Error('数据库未配置');
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        username,
        real_name,
        phone,
        email,
        id_card,
        status,
        balance_cny,
        balance_hkd,
        frozen_balance_cny,
        frozen_balance_hkd,
        total_deposit,
        total_withdraw,
        trade_days,
        created_at,
        last_login_at,
        organizations(name)
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 处理数据格式
    const processedData = users?.map(user => ({
      用户ID: user.id,
      用户名: user.username,
      真实姓名: user.real_name,
      手机号: user.phone,
      邮箱: user.email,
      身份证: user.id_card,
      状态: user.status,
      人民币余额: user.balance_cny,
      港币余额: user.balance_hkd,
      人民币冻结: user.frozen_balance_cny,
      港币冻结: user.frozen_balance_hkd,
      总充值: user.total_deposit,
      总提现: user.total_withdraw,
      交易天数: user.trade_days,
      注册时间: user.created_at,
      最后登录: user.last_login_at,
      所属机构: (user.organizations as any)?.name || ''
    })) || [];

    return {
      metadata: {
        export_time: new Date().toISOString(),
        date_range: `${startDate} 至 ${endDate}`,
        total_records: processedData.length
      },
      data: processedData
    };
  } catch (error: any) {
    throw new Error(`导出用户数据失败: ${error.message}`);
  }
}

// 导出订单数据
async function exportOrdersData(startDate: string, endDate: string, type: string) {
  try {
    if (!supabase) throw new Error('数据库未配置');
    let query = supabase
      .from('orders')
      .select(`
        id,
        user_id,
        trade_type,
        symbol,
        symbol_name,
        side,
        price,
        quantity,
        status,
        created_at,
        approved_at,
        users(username, real_name)
      `)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (type !== 'all') {
      query = query.eq('trade_type', type);
    }

    const { data: orders, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    const processedData = orders?.map(order => ({
      订单ID: order.id,
      用户ID: order.user_id,
      用户名: (order.users as any)?.username || '',
      真实姓名: (order.users as any)?.real_name || '',
      交易类型: order.trade_type,
      股票代码: order.symbol,
      股票名称: order.symbol_name,
      买卖方向: order.side,
      价格: order.price,
      数量: order.quantity,
      状态: order.status,
      创建时间: order.created_at,
      审核时间: order.approved_at
    })) || [];

    return {
      metadata: {
        export_time: new Date().toISOString(),
        date_range: `${startDate} 至 ${endDate}`,
        order_type: type,
        total_records: processedData.length
      },
      data: processedData
    };
  } catch (error: any) {
    throw new Error(`导出订单数据失败: ${error.message}`);
  }
}

// 导出财务数据
async function exportFinanceData(month: string) {
  try {
    const startDate = `${month}-01`;
    const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0).toISOString().split('T')[0];

    if (!supabase) throw new Error('数据库未配置');
    // 获取充值记录
    const { data: recharges } = await supabase
      .from('recharge_requests')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', `${endDate}T23:59:59`)
      .order('created_at', { ascending: false });

    // 获取提现记录
    const { data: withdrawals } = await supabase
      .from('withdraw_requests')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', `${endDate}T23:59:59`)
      .order('created_at', { ascending: false });

    // 获取资金流水
    const { data: flows } = await supabase
      .from('transaction_flows')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', `${endDate}T23:59:59`)
      .order('created_at', { ascending: false });

    return {
      metadata: {
        export_time: new Date().toISOString(),
        month: month,
        date_range: `${startDate} 至 ${endDate}`
      },
      data: {
        recharge_records: recharges?.map(r => ({
          申请ID: r.id,
          用户ID: r.user_id,
          金额: r.amount,
          币种: r.currency,
          支付方式: r.payment_method,
          状态: r.status,
          创建时间: r.created_at
        })) || [],
        withdrawal_records: withdrawals?.map(w => ({
          申请ID: w.id,
          用户ID: w.user_id,
          金额: w.amount,
          币种: w.currency,
          银行名称: w.bank_name,
          银行账号: w.bank_account,
          持卡人: w.account_holder,
          状态: w.status,
          创建时间: w.created_at
        })) || [],
        transaction_flows: flows?.map(f => ({
          流水ID: f.id,
          用户ID: f.user_id,
          类型: f.type,
          金额: f.amount,
          币种: f.currency,
          余额后: f.balance_after,
          描述: f.description,
          是否结算: f.settled,
          创建时间: f.created_at
        })) || []
      }
    };
  } catch (error: any) {
    throw new Error(`导出财务数据失败: ${error.message}`);
  }
}

// 导出交易数据
async function exportTradesData(startDate: string, endDate: string, tradeType: string) {
  try {
    if (!supabase) throw new Error('数据库未配置');
    let query = supabase
      .from('order_executions')
      .select(`
        id,
        order_id,
        user_id,
        symbol,
        symbol_name,
        side,
        price,
        quantity,
        executed_at,
        commission,
        users(username, real_name)
      `)
      .gte('executed_at', startDate)
      .lte('executed_at', endDate);

    if (tradeType !== 'all') {
      // 根据交易类型关联不同表
      query = query.eq('trade_type', tradeType);
    }

    const { data: executions, error } = await query.order('executed_at', { ascending: false });

    if (error) throw error;

    const processedData = executions?.map(execution => ({
      成交ID: execution.id,
      订单ID: execution.order_id,
      用户ID: execution.user_id,
      用户名: (execution.users as any)?.username || '',
      真实姓名: (execution.users as any)?.real_name || '',
      股票代码: execution.symbol,
      股票名称: execution.symbol_name,
      买卖方向: execution.side,
      成交价格: execution.price,
      成交数量: execution.quantity,
      手续费: execution.commission,
      成交时间: execution.executed_at
    })) || [];

    return {
      metadata: {
        export_time: new Date().toISOString(),
        date_range: `${startDate} 至 ${endDate}`,
        trade_type: tradeType,
        total_records: processedData.length
      },
      data: processedData
    };
  } catch (error: any) {
    throw new Error(`导出交易数据失败: ${error.message}`);
  }
}

// 转换为CSV格式
function convertToCSV(data: any[]): string {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // 处理包含逗号或引号的值
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');
  
  return csvContent;
}