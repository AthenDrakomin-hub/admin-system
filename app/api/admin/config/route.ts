import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAdminAuth } from '@/lib/auth';

/**
 * 管理端系统配置API
 * 支持系统参数、交易参数、限额配置等管理
 * 
 * GET /api/admin/config/system - 获取系统配置
 * GET /api/admin/config/trade - 获取交易配置
 * GET /api/admin/config/limits - 获取限额配置
 * POST /api/admin/config/update - 更新配置
 */

// 获取配置信息
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
    const type = searchParams.get('type') || 'system'; // system, trade, limits, all

    if (!supabase) {
      return NextResponse.json({ success: false, error: '数据库未配置' }, { status: 500 });
    }

    switch (type) {
      case 'system':
        return await getSystemConfig();
      case 'trade':
        return await getTradeConfig();
      case 'limits':
        return await getLimitsConfig();
      case 'all':
        return await getAllConfig();
      default:
        return NextResponse.json({ success: false, error: '不支持的配置类型' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('系统配置API错误:', error);
    return NextResponse.json({ success: false, error: error.message || '获取配置失败' }, { status: 500 });
  }
}

// 更新配置
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
    const { configType, data, adminId, adminName } = body;

    if (!configType || !data) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ success: false, error: '数据库未配置' }, { status: 500 });
    }

    // 更新配置
    const result = await updateConfig(configType, data, adminId, adminName);
    
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: '配置更新成功',
      data: result.data
    });
  } catch (error: any) {
    console.error('系统配置更新错误:', error);
    return NextResponse.json({ success: false, error: error.message || '更新配置失败' }, { status: 500 });
  }
}

// 获取系统配置
async function getSystemConfig() {
  if (!supabase) throw new Error('数据库未配置');
  const { data: configs, error } = await supabase
    .from('system_configs')
    .select('*')
    .eq('category', 'system')
    .order('key');

  if (error) throw error;

  // 转换为键值对格式
  const configMap: Record<string, any> = {};
  configs?.forEach(config => {
    try {
      configMap[config.key] = JSON.parse(config.value);
    } catch {
      configMap[config.key] = config.value;
    }
  });

  return NextResponse.json({
    success: true,
    data: {
      site_name: configMap.site_name || '证券交易系统',
      site_description: configMap.site_description || '专业的证券交易管理平台',
      maintenance_mode: configMap.maintenance_mode || false,
      registration_enabled: configMap.registration_enabled !== undefined ? configMap.registration_enabled : true,
      email_verification_required: configMap.email_verification_required || false,
      session_timeout: configMap.session_timeout || 7200,
      max_login_attempts: configMap.max_login_attempts || 5,
      captcha_enabled: configMap.captcha_enabled || false,
      timezone: configMap.timezone || 'Asia/Shanghai',
      language: configMap.language || 'zh-CN',
      theme: configMap.theme || 'light'
    }
  });
}

// 获取交易配置
async function getTradeConfig() {
  if (!supabase) throw new Error('数据库未配置');
  const { data: configs, error } = await supabase
    .from('system_configs')
    .select('*')
    .eq('category', 'trade')
    .order('key');

  if (error) throw error;

  const configMap: Record<string, any> = {};
  configs?.forEach(config => {
    try {
      configMap[config.key] = JSON.parse(config.value);
    } catch {
      configMap[config.key] = config.value;
    }
  });

  return NextResponse.json({
    success: true,
    data: {
      // A股交易配置
      a_share: {
        enabled: configMap.a_share_enabled !== undefined ? configMap.a_share_enabled : true,
        trading_hours: configMap.a_share_trading_hours || [
          { start: '09:30', end: '11:30' },
          { start: '13:00', end: '15:00' }
        ],
        min_order_amount: configMap.a_share_min_order_amount || 1000,
        max_order_amount: configMap.a_share_max_order_amount || 1000000,
        price_limit_up: configMap.a_share_price_limit_up || 0.1,
        price_limit_down: configMap.a_share_price_limit_down || 0.1,
        commission_rate: configMap.a_share_commission_rate || 0.0003,
        minimum_commission: configMap.a_share_minimum_commission || 5
      },
      
      // 港股交易配置
      hk_share: {
        enabled: configMap.hk_share_enabled !== undefined ? configMap.hk_share_enabled : true,
        trading_hours: configMap.hk_share_trading_hours || [
          { start: '09:30', end: '12:00' },
          { start: '13:00', end: '16:00' }
        ],
        min_order_amount: configMap.hk_share_min_order_amount || 800,
        max_order_amount: configMap.hk_share_max_order_amount || 500000,
        commission_rate: configMap.hk_share_commission_rate || 0.0005,
        minimum_commission: configMap.hk_share_minimum_commission || 5,
        stamp_duty: configMap.hk_share_stamp_duty || 0.001
      },
      
      // 通用交易配置
      general: {
        order_validity: configMap.order_validity || 'GFD', // GFD:当日有效, GTC:撤销前有效
        max_open_orders: configMap.max_open_orders || 50,
        auto_cancel_time: configMap.auto_cancel_time || 86400, // 24小时后自动撤销
        market_data_delay: configMap.market_data_delay || 15, // 行情延迟秒数
        execution_mode: configMap.execution_mode || 'manual' // manual:人工审核, auto:自动执行
      }
    }
  });
}

// 获取限额配置
async function getLimitsConfig() {
  if (!supabase) throw new Error('数据库未配置');
  const { data: configs, error } = await supabase
    .from('system_configs')
    .select('*')
    .eq('category', 'limits')
    .order('key');

  if (error) throw error;

  const configMap: Record<string, any> = {};
  configs?.forEach(config => {
    try {
      configMap[config.key] = JSON.parse(config.value);
    } catch {
      configMap[config.key] = config.value;
    }
  });

  return NextResponse.json({
    success: true,
    data: {
      // 用户等级限额
      user_levels: {
        bronze: {
          daily_trade_limit: configMap.bronze_daily_trade_limit || 50000,
          monthly_trade_limit: configMap.bronze_monthly_trade_limit || 500000,
          single_order_limit: configMap.bronze_single_order_limit || 10000,
          position_limit: configMap.bronze_position_limit || 100000
        },
        silver: {
          daily_trade_limit: configMap.silver_daily_trade_limit || 200000,
          monthly_trade_limit: configMap.silver_monthly_trade_limit || 2000000,
          single_order_limit: configMap.silver_single_order_limit || 50000,
          position_limit: configMap.silver_position_limit || 500000
        },
        gold: {
          daily_trade_limit: configMap.gold_daily_trade_limit || 1000000,
          monthly_trade_limit: configMap.gold_monthly_trade_limit || 10000000,
          single_order_limit: configMap.gold_single_order_limit || 200000,
          position_limit: configMap.gold_position_limit || 2000000
        }
      },
      
      // 资金限额
      funds: {
        min_deposit: configMap.min_deposit || 100,
        max_deposit: configMap.max_deposit || 1000000,
        min_withdraw: configMap.min_withdraw || 100,
        max_withdraw: configMap.max_withdraw || 500000,
        daily_withdraw_limit: configMap.daily_withdraw_limit || 1000000,
        monthly_withdraw_limit: configMap.monthly_withdraw_limit || 3000000
      },
      
      // 风控限额
      risk: {
        suspicious_activity_threshold: configMap.suspicious_activity_threshold || 100000,
        high_frequency_threshold: configMap.high_frequency_threshold || 10,
        large_amount_threshold: configMap.large_amount_threshold || 500000,
        daily_loss_limit: configMap.daily_loss_limit || 100000
      }
    }
  });
}

// 获取所有配置
async function getAllConfig() {
  const systemConfig = await getSystemConfig();
  const tradeConfig = await getTradeConfig();
  const limitsConfig = await getLimitsConfig();

  const systemData = await systemConfig.json();
  const tradeData = await tradeConfig.json();
  const limitsData = await limitsConfig.json();

  return NextResponse.json({
    success: true,
    data: {
      system: systemData.data,
      trade: tradeData.data,
      limits: limitsData.data
    }
  });
}

// 更新配置
async function updateConfig(configType: string, data: any, adminId: string, adminName: string) {
  // 空值检查
  if (!supabase) {
    throw new Error('数据库未配置');
  }
  
  try {
    let category = '';
    let configData: Record<string, any> = {};

    switch (configType) {
      case 'system':
        category = 'system';
        configData = {
          site_name: data.site_name,
          site_description: data.site_description,
          maintenance_mode: data.maintenance_mode,
          registration_enabled: data.registration_enabled,
          email_verification_required: data.email_verification_required,
          session_timeout: data.session_timeout,
          max_login_attempts: data.max_login_attempts,
          captcha_enabled: data.captcha_enabled,
          timezone: data.timezone,
          language: data.language,
          theme: data.theme
        };
        break;

      case 'trade':
        category = 'trade';
        if (data.a_share) {
          Object.assign(configData, {
            a_share_enabled: data.a_share.enabled,
            a_share_trading_hours: data.a_share.trading_hours,
            a_share_min_order_amount: data.a_share.min_order_amount,
            a_share_max_order_amount: data.a_share.max_order_amount,
            a_share_price_limit_up: data.a_share.price_limit_up,
            a_share_price_limit_down: data.a_share.price_limit_down,
            a_share_commission_rate: data.a_share.commission_rate,
            a_share_minimum_commission: data.a_share.minimum_commission
          });
        }
        if (data.hk_share) {
          Object.assign(configData, {
            hk_share_enabled: data.hk_share.enabled,
            hk_share_trading_hours: data.hk_share.trading_hours,
            hk_share_min_order_amount: data.hk_share.min_order_amount,
            hk_share_max_order_amount: data.hk_share.max_order_amount,
            hk_share_commission_rate: data.hk_share.commission_rate,
            hk_share_minimum_commission: data.hk_share.minimum_commission,
            hk_share_stamp_duty: data.hk_share.stamp_duty
          });
        }
        if (data.general) {
          Object.assign(configData, {
            order_validity: data.general.order_validity,
            max_open_orders: data.general.max_open_orders,
            auto_cancel_time: data.general.auto_cancel_time,
            market_data_delay: data.general.market_data_delay,
            execution_mode: data.general.execution_mode
          });
        }
        break;

      case 'limits':
        category = 'limits';
        if (data.user_levels) {
          Object.assign(configData, {
            bronze_daily_trade_limit: data.user_levels.bronze.daily_trade_limit,
            bronze_monthly_trade_limit: data.user_levels.bronze.monthly_trade_limit,
            bronze_single_order_limit: data.user_levels.bronze.single_order_limit,
            bronze_position_limit: data.user_levels.bronze.position_limit,
            silver_daily_trade_limit: data.user_levels.silver.daily_trade_limit,
            silver_monthly_trade_limit: data.user_levels.silver.monthly_trade_limit,
            silver_single_order_limit: data.user_levels.silver.single_order_limit,
            silver_position_limit: data.user_levels.silver.position_limit,
            gold_daily_trade_limit: data.user_levels.gold.daily_trade_limit,
            gold_monthly_trade_limit: data.user_levels.gold.monthly_trade_limit,
            gold_single_order_limit: data.user_levels.gold.single_order_limit,
            gold_position_limit: data.user_levels.gold.position_limit
          });
        }
        if (data.funds) {
          Object.assign(configData, {
            min_deposit: data.funds.min_deposit,
            max_deposit: data.funds.max_deposit,
            min_withdraw: data.funds.min_withdraw,
            max_withdraw: data.funds.max_withdraw,
            daily_withdraw_limit: data.funds.daily_withdraw_limit,
            monthly_withdraw_limit: data.funds.monthly_withdraw_limit
          });
        }
        if (data.risk) {
          Object.assign(configData, {
            suspicious_activity_threshold: data.risk.suspicious_activity_threshold,
            high_frequency_threshold: data.risk.high_frequency_threshold,
            large_amount_threshold: data.risk.large_amount_threshold,
            daily_loss_limit: data.risk.daily_loss_limit
          });
        }
        break;

      default:
        return { success: false, error: '不支持的配置类型' };
    }

    // 批量更新配置
    const updates = Object.entries(configData).map(([key, value]) => ({
      category,
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : String(value),
      updated_by: adminId,
      updated_at: new Date().toISOString()
    }));

    // 先删除旧配置
    await supabase
      .from('system_configs')
      .delete()
      .eq('category', category);

    // 插入新配置
    const { error } = await supabase
      .from('system_configs')
      .insert(updates);

    if (error) throw error;

    // 记录审计日志
    await supabase.from('audit_logs').insert({
      admin_id: adminId,
      admin_name: adminName,
      action: `update_${configType}_config`,
      target_type: 'system_config',
      target_id: null,
      description: `更新${configType}配置`,
      reason: `配置类型: ${configType}`,
      created_at: new Date().toISOString()
    });

    return { success: true, data: configData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}