import jwt from 'jsonwebtoken';

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
