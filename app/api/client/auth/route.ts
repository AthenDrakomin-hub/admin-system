import { NextRequest } from 'next/server';
import { clientResponse, clientError } from '@/lib/client';
import { generateClientToken, verifyAuth } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!;

/**
 * 客户端用户登录
 */
export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return clientError('请输入用户名和密码');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 查询客户端用户
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password_hash, status')
      .eq('username', username)
      .single();

    if (error || !user) {
      return clientError('用户名或密码错误', 401);
    }

    // 检查用户状态
    if (user.status !== 'active') {
      return clientError('账户已被冻结，请联系客服', 403);
    }

    // 验证密码
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return clientError('用户名或密码错误', 401);
    }

    // 生成Token
    const token = generateClientToken({
      username: user.username,
      role: 'user' // 客户端用户角色
    });

    return clientResponse({
      token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (error: any) {
    console.error('登录错误:', error);
    return clientError('登录失败，请稍后重试');
  }
}

/**
 * 获取当前用户信息
 */
export async function GET(req: NextRequest) {
  try {
    // 从Authorization头获取token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return clientError('未授权访问', 401);
    }

    const token = authHeader.substring(7);
    const authUser = await verifyAuth(token);

    if (!authUser) {
      return clientError('无效的认证信息', 401);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 查询用户详细信息
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, phone, real_name, id_card, status, created_at, balance_cny, balance_hkd, frozen_balance_cny, frozen_balance_hkd, total_deposit, total_withdraw, trade_days')
      .eq('username', authUser.username)
      .single();

    if (error || !user) {
      return clientError('用户不存在', 404);
    }

    return clientResponse({
      user: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        real_name: user.real_name,
        id_card: user.id_card,
        status: user.status,
        created_at: user.created_at,
        balance_cny: user.balance_cny,
        balance_hkd: user.balance_hkd,
        frozen_balance_cny: user.frozen_balance_cny,
        frozen_balance_hkd: user.frozen_balance_hkd,
        total_deposit: user.total_deposit,
        total_withdraw: user.total_withdraw,
        trade_days: user.trade_days
      }
    });
  } catch (error: any) {
    console.error('获取用户信息错误:', error);
    return clientError('获取用户信息失败');
  }
}
