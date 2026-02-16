'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// 初始化Supabase服务端客户端（适配你的环境变量）
const getSupabase = () => {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, // 你的Supabase地址
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // 你的匿名密钥
    { 
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      } 
    }
  );
};

// 初始化Admin级Supabase（用于删除用户，适配你的服务端密钥）
const getAdminSupabase = () => {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!, // 你的服务端角色密钥
    { 
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      } 
    }
  );
};

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    // 解构请求体（保留invite_code，暂不校验）
    const { username, password, real_name, phone, email, id_card, invite_code } = await request.json();

    // 1. 基础参数校验
    if (!username || !password || !real_name || !phone || !email) {
      return NextResponse.json(
        { success: false, error: "用户名/密码/真实姓名/手机号/邮箱不能为空" },
        { status: 400 }
      );
    }

    // 2. 检查public.users中用户名/手机号/邮箱是否已存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .or(`username.eq.${username},phone.eq.${phone},email.eq.${email}`)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "用户名/手机号/邮箱已存在" },
        { status: 400 }
      );
    }

    // 3. 在auth.users创建认证用户
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        // 跳过邮箱验证（测试用，正式环境可改为你的验证页面）
        emailRedirectTo: process.env.NEXT_PUBLIC_APP_URL || 'https://www.zhengyutouzi.com/auth/verify'
      }
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { success: false, error: authError?.message || "账号创建失败" },
        { status: 400 }
      );
    }

    // 4. 在public.users写入业务字段
    const { error: userError } = await supabase
      .from('users')
      .update({
        username: username,
        real_name: real_name,
        phone: phone,
        id_card: id_card || null,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', authData.user.id);

    if (userError) {
      console.error("更新业务用户失败:", userError);
      // 回滚：使用Admin密钥删除auth用户
      const adminSupabase = getAdminSupabase();
      await adminSupabase.auth.admin.deleteUser(authData.user.id);
      
      return NextResponse.json(
        { success: false, error: "用户创建失败" },
        { status: 500 }
      );
    }

    // 5. 注册成功响应
    return NextResponse.json({
      success: true,
      data: {
        id: authData.user.id,
        username: username,
        message: "注册成功，请登录"
      }
    });

  } catch (err) {
    console.error("注册接口异常:", err);
    return NextResponse.json(
      { success: false, error: "服务器内部错误" },
      { status: 500 }
    );
  }
}