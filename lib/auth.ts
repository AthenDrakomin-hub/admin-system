import jwt from 'jsonwebtoken';
import { supabase } from './supabase';
import { AdminUser, AdminRole, getPermissions } from '@/types/admin';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthUser {
  username: string;
  role: 'super_admin' | 'admin';
}

/**
 * 生成JWT Token
 */
export function generateToken(user: AuthUser): string {
  return jwt.sign(
    { username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * 验证JWT Token
 */
export async function verifyAuth(token: string): Promise<AuthUser | null> {
  try {
    console.log('verifyAuth - JWT_SECRET:', JWT_SECRET ? 'exists' : 'missing');
    console.log('verifyAuth - token:', token.substring(0, 20) + '...');
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    console.log('verifyAuth - decoded:', decoded);
    return decoded;
  } catch (error) {
    console.log('verifyAuth - error:', error);
    return null;
  }
}

/**
 * 验证管理员身份并返回完整的管理员信息
 */
export async function verifyAdminAuth(token: string): Promise<AdminUser | null> {
  try {
    // 验证JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as { username: string; role: AdminRole };
    
    if (!decoded || !decoded.username) {
      return null;
    }

    // 从数据库查询管理员信息
    const { data: adminData, error } = await supabase
      .from('admins')
      .select('*')
      .eq('username', decoded.username)
      .eq('status', 'active')
      .single();

    if (error || !adminData) {
      console.error('管理员查询失败:', error);
      return null;
    }

    // 构建完整的AdminUser对象
    const adminUser: AdminUser = {
      id: adminData.id,
      username: adminData.username,
      role: adminData.role as AdminRole,
      created_at: adminData.created_at,
      last_login: adminData.last_login_at,
      permissions: getPermissions(adminData.role as AdminRole)
    };

    return adminUser;
  } catch (error) {
    console.error('管理员验证失败:', error);
    return null;
  }
}

/**
 * 生成管理员JWT Token
 */
export function generateAdminToken(admin: { username: string; role: AdminRole }): string {
  return jwt.sign(
    { username: admin.username, role: admin.role },
    JWT_SECRET,
    { expiresIn: '24h' } // 管理员token有效期更短
  );
}
