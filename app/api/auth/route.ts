import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    console.log('登录请求:', { username, passwordLength: password?.length });

    if (!username || !password) {
      console.log('缺少用户名或密码');
      return NextResponse.json(
        { success: false, error: '请输入用户名和密码' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

    console.log('环境变量检查:', { 
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseKey: !!supabaseKey,
      supabaseUrlLength: supabaseUrl?.length
    });

    if (!supabaseUrl || !supabaseKey) {
      console.error('缺少Supabase环境变量');
      return NextResponse.json(
        { success: false, error: '服务器配置错误' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 查询管理员
    console.log('查询管理员:', username);
    const { data: admin, error } = await supabase
      .from('admins')
      .select('username, password_hash, role')
      .eq('username', username)
      .single();

    console.log('查询结果:', { admin: !!admin, error: error?.message });

    if (error || !admin) {
      console.log('管理员不存在或查询错误:', error?.message);
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 验证密码
    console.log('验证密码...');
    const isValid = await bcrypt.compare(password, admin.password_hash);
    console.log('密码验证结果:', isValid);
    
    if (!isValid) {
      console.log('密码验证失败');
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 生成Token
    console.log('生成Token...');
    const token = generateToken({
      username: admin.username,
      role: admin.role
    });

    console.log('登录成功:', { username: admin.username, role: admin.role });

    return NextResponse.json({
      success: true,
      token,
      user: {
        username: admin.username,
        role: admin.role
      }
    });
  } catch (error: any) {
    console.error('登录错误:', error);
    return NextResponse.json(
      { success: false, error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}
