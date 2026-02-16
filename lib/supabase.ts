import { createClient } from '@supabase/supabase-js';

// 1. 读取正确的环境变量（重点：用 NEXT_SUPABASE_SERVICE_ROLE_KEY）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// 关键修正：使用你环境变量里的 NEXT_SUPABASE_SERVICE_ROLE_KEY
const supabaseServiceKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!;

// 2. 创建管理端高权限客户端
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  // 新增：强制指定角色为 service_role
  global: {
    headers: {
      'X-Supabase-Role': 'service_role',
    },
  },
});

// 3. 前端普通客户端（不变）
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// 4. 保持向后兼容的导出
// 默认客户端（使用service_role绕过RLS）- 保持向后兼容
export const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * 创建服务器端Supabase客户端（用于认证）
 */
export function createSupabaseServerClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase not configured');
  }
  
  // 使用服务角色密钥创建客户端，可以调用auth.getUser()等
  const client = createClient(supabaseUrl, supabaseServiceKey);
  return client;
}

/**
 * 管理员操作客户端（带RLS上下文）
 * @param adminUsername 管理员账号
 */
export async function createAdminClient(adminUsername: string) {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase not configured');
  }
  
  const client = createClient(supabaseUrl, supabaseServiceKey);
  
  // 设置RLS上下文
  await client.rpc('set_config', {
    setting_name: 'app.current_admin',
    setting_value: adminUsername
  });
  
  return client;
}

/**
 * 客户端用户操作客户端（带RLS上下文）
 * @param userId 用户ID
 */
export async function createClientUserClient(userId: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase not configured');
  }
  
  const client = createClient(supabaseUrl, supabaseAnonKey);
  
  // 设置RLS上下文
  await client.rpc('set_config', {
    setting_name: 'app.current_user_id',
    setting_value: userId
  });
  
  return client;
}

// 新增：JWT 解码函数（无需安装依赖，纯前端解析）
function decodeJwt(token: string) {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
}

// 调试日志：验证变量是否加载成功
console.log('✅ Supabase URL:', supabaseUrl ? '已加载' : '未加载');
console.log('✅ Service Role 密钥长度:', supabaseServiceKey?.length || '0'); // 应该是100+

// 使用JWT解码验证密钥类型
if (supabaseServiceKey) {
  const decoded = decodeJwt(supabaseServiceKey);
  console.log('✅ JWT 解码后的 role:', decoded?.role || '未知'); // 会显示 service_role
  console.log('✅ 密钥是否为 service_role 类型:', decoded?.role === 'service_role'); // 会显示 true
} else {
  console.log('❌ Service Role 密钥未加载');
}