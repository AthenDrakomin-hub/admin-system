import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 默认客户端（使用service_role绕过RLS）
export const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

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
