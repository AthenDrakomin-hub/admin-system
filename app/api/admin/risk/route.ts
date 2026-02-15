import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/auth';

/**
 * 管理端风控管理API
 * 支持风控规则管理、风险预警、自动处置等功能
 * 
 * GET /api/admin/risk/rules - 获取风控规则列表
 * POST /api/admin/risk/rules - 创建风控规则
 * PUT /api/admin/risk/rules/{id} - 更新风控规则
 * DELETE /api/admin/risk/rules/{id} - 删除风控规则
 * GET /api/admin/risk/alerts - 获取风险预警
 * POST /api/admin/risk/actions - 执行风控动作
 */

// 获取风控规则或预警信息
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
    const type = searchParams.get('type') || 'rules'; // rules, alerts, events
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!supabase) {
      return NextResponse.json({ success: false, error: '数据库未配置' }, { status: 500 });
    }

    switch (type) {
      case 'rules':
        return await getRiskRules(status, page, limit);
      case 'alerts':
        return await getRiskAlerts(status, page, limit);
      case 'events':
        return await getRiskEvents(page, limit);
      default:
        return NextResponse.json({ success: false, error: '不支持的类型参数' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('风控管理API错误:', error);
    return NextResponse.json({ success: false, error: error.message || '获取风控信息失败' }, { status: 500 });
  }
}

// 创建风控规则或执行风控动作
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
    const { action, data, adminId, adminName } = body;

    if (!supabase) {
      return NextResponse.json({ success: false, error: '数据库未配置' }, { status: 500 });
    }

    if (action) {
      // 执行风控动作
      return await executeRiskAction(action, data, adminId, adminName);
    } else {
      // 创建风控规则
      return await createRiskRule(data, adminId, adminName);
    }
  } catch (error: any) {
    console.error('风控管理创建错误:', error);
    return NextResponse.json({ success: false, error: error.message || '风控操作失败' }, { status: 500 });
  }
}

// 更新风控规则
export async function PUT(req: NextRequest) {
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
    const { id, data, adminId, adminName } = body;

    if (!id || !data) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ success: false, error: '数据库未配置' }, { status: 500 });
    }

    const { error } = await supabase
      .from('risk_rules')
      .update({
        ...data,
        updated_by: adminId,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    // 记录审计日志
    await supabase.from('audit_logs').insert({
      admin_id: adminId,
      admin_name: adminName,
      action: 'update_risk_rule',
      target_type: 'risk_rule',
      target_id: id,
      description: '更新风控规则',
      reason: `规则ID: ${id}`,
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: '风控规则更新成功'
    });
  } catch (error: any) {
    console.error('风控规则更新错误:', error);
    return NextResponse.json({ success: false, error: error.message || '更新风控规则失败' }, { status: 500 });
  }
}

// 删除风控规则
export async function DELETE(req: NextRequest) {
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: '缺少规则ID参数' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ success: false, error: '数据库未配置' }, { status: 500 });
    }

    const { error } = await supabase
      .from('risk_rules')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // 记录审计日志
    await supabase.from('audit_logs').insert({
      admin_id: admin.username,
      admin_name: admin.username,
      action: 'delete_risk_rule',
      target_type: 'risk_rule',
      target_id: id,
      description: '删除风控规则',
      reason: `规则ID: ${id}`,
      created_at: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: '风控规则删除成功'
    });
  } catch (error: any) {
    console.error('风控规则删除错误:', error);
    return NextResponse.json({ success: false, error: error.message || '删除风控规则失败' }, { status: 500 });
  }
}

// 获取风控规则列表
async function getRiskRules(status: string, page: number, limit: number) {
  if (!supabase) throw new Error('数据库未配置');
  let query = supabase
    .from('risk_rules')
    .select('*', { count: 'exact' });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: rules, count, error } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: rules || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit)
    }
  });
}

// 获取风险预警列表
async function getRiskAlerts(status: string, page: number, limit: number) {
  if (!supabase) throw new Error('数据库未配置');
  let query = supabase
    .from('risk_alerts')
    .select(`
      *,
      users(username, real_name),
      risk_rules(name, description)
    `, { count: 'exact' });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data: alerts, count, error } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: alerts || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit)
    }
  });
}

// 获取风险事件列表
async function getRiskEvents(page: number, limit: number) {
  if (!supabase) throw new Error('数据库未配置');
  const { data: events, count, error } = await supabase
    .from('risk_events')
    .select(`
      *,
      users(username, real_name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (error) throw error;

  return NextResponse.json({
    success: true,
    data: events || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit)
    }
  });
}

// 创建风控规则
async function createRiskRule(data: any, adminId: string, adminName: string) {
  // 空值检查
  if (!supabase) {
    throw new Error('数据库未配置');
  }
  
  const { name, description, rule_type, conditions, actions, severity, enabled } = data;

  if (!name || !rule_type || !conditions || !actions) {
    return NextResponse.json({ success: false, error: '缺少必要规则参数' }, { status: 400 });
  }

  const { data: rule, error } = await supabase
    .from('risk_rules')
    .insert({
      name,
      description,
      rule_type,
      conditions: JSON.stringify(conditions),
      actions: JSON.stringify(actions),
      severity: severity || 'medium',
      enabled: enabled !== undefined ? enabled : true,
      created_by: adminId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // 记录审计日志
  await supabase.from('audit_logs').insert({
    admin_id: adminId,
    admin_name: adminName,
    action: 'create_risk_rule',
    target_type: 'risk_rule',
    target_id: rule.id,
    description: '创建风控规则',
    reason: `规则名称: ${name}`,
    created_at: new Date().toISOString()
  });

  return NextResponse.json({
    success: true,
    message: '风控规则创建成功',
    data: rule
  });
}

// 执行风控动作
async function executeRiskAction(action: string, data: any, adminId: string, adminName: string) {
  switch (action) {
    case 'trigger_manual_check':
      return await triggerManualCheck(data, adminId, adminName);
    
    case 'auto_suspend_user':
      return await autoSuspendUser(data, adminId, adminName);
    
    case 'send_risk_warning':
      return await sendRiskWarning(data, adminId, adminName);
    
    case 'block_suspicious_trade':
      return await blockSuspiciousTrade(data, adminId, adminName);
    
    default:
      return NextResponse.json({ success: false, error: '不支持的风控动作' }, { status: 400 });
  }
}

// 触发人工审核
async function triggerManualCheck(data: any, adminId: string, adminName: string) {
  // 空值检查
  if (!supabase) {
    throw new Error('数据库未配置');
  }
  
  const { userId, reason, priority } = data;
  
  if (!userId || !reason) {
    return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
  }

  const { error } = await supabase.from('manual_checks').insert({
    user_id: userId,
    reason,
    priority: priority || 'medium',
    status: 'pending',
    assigned_to: null,
    created_by: adminId,
    created_at: new Date().toISOString()
  });

  if (error) throw error;

  // 记录审计日志
  await supabase.from('audit_logs').insert({
    admin_id: adminId,
    admin_name: adminName,
    action: 'trigger_manual_check',
    target_type: 'user',
    target_id: userId,
    description: '触发人工审核',
    reason,
    created_at: new Date().toISOString()
  });

  return NextResponse.json({
    success: true,
    message: '人工审核任务已创建'
  });
}

// 自动暂停用户
async function autoSuspendUser(data: any, adminId: string, adminName: string) {
  // 空值检查
  if (!supabase) {
    throw new Error('数据库未配置');
  }
  
  const { userId, reason } = data;
  
  if (!userId || !reason) {
    return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
  }

  const { error } = await supabase
    .from('users')
    .update({
      status: 'suspended',
      suspended_at: new Date().toISOString(),
      suspended_reason: `自动风控: ${reason}`,
      suspended_by: adminId
    })
    .eq('id', userId);

  if (error) throw error;

  // 发送站内信通知
  await supabase.from('system_messages').insert({
    user_id: userId,
    type: 'risk_alert',
    title: '账户风险管控通知',
    content: `您的账户因触发风控规则被暂时暂停，请联系客服了解详情。原因：${reason}`,
    sent_by: adminId,
    sent_at: new Date().toISOString(),
    read: false
  });

  // 记录审计日志
  await supabase.from('audit_logs').insert({
    admin_id: adminId,
    admin_name: adminName,
    action: 'auto_suspend_user',
    target_type: 'user',
    target_id: userId,
    description: '自动暂停用户账户',
    reason,
    created_at: new Date().toISOString()
  });

  return NextResponse.json({
    success: true,
    message: '用户已自动暂停'
  });
}

// 发送风险警告
async function sendRiskWarning(data: any, adminId: string, adminName: string) {
  const { userId, warningType, content } = data;
  
  if (!userId || !warningType || !content) {
    return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
  }

  if (!supabase) throw new Error('数据库未配置');
  const { error } = await supabase.from('system_messages').insert({
    user_id: userId,
    type: 'risk_warning',
    title: getWarningTitle(warningType),
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
    action: 'send_risk_warning',
    target_type: 'user',
    target_id: userId,
    description: `发送${warningType}风险警告`,
    reason: content,
    created_at: new Date().toISOString()
  });

  return NextResponse.json({
    success: true,
    message: '风险警告已发送'
  });
}

// 阻止可疑交易
async function blockSuspiciousTrade(data: any, adminId: string, adminName: string) {
  const { orderId, reason } = data;
  
  if (!orderId || !reason) {
    return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
  }

  if (!supabase) throw new Error('数据库未配置');
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'blocked',
      blocked_at: new Date().toISOString(),
      blocked_reason: `可疑交易拦截: ${reason}`,
      blocked_by: adminId
    })
    .eq('id', orderId);

  if (error) throw error;

  // 记录审计日志
  await supabase.from('audit_logs').insert({
    admin_id: adminId,
    admin_name: adminName,
    action: 'block_suspicious_trade',
    target_type: 'order',
    target_id: orderId,
    description: '阻止可疑交易',
    reason,
    created_at: new Date().toISOString()
  });

  return NextResponse.json({
    success: true,
    message: '可疑交易已阻止'
  });
}

// 获取警告标题
function getWarningTitle(warningType: string): string {
  const titles: Record<string, string> = {
    'high_frequency': '高频交易风险提醒',
    'large_amount': '大额交易风险提醒',
    'price_anomaly': '价格异常风险提醒',
    'pattern_match': '交易模式风险提醒',
    'geographic': '地理位置风险提醒'
  };
  return titles[warningType] || '风险提醒';
}