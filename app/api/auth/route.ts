import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs'; // 使用 bcryptjs 而不是 bcrypt，因为项目已安装
import { supabase } from '@/lib/supabase'; // 你的supabase实例

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // 1. 校验参数
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '请输入用户名和密码' },
        { status: 400 }
      );
    }

    // 检查 supabase 实例是否可用
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: '服务器配置错误' },
        { status: 500 }
      );
    }

    // 2. 查询管理员信息
    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, username, password_hash, role, status')
      .eq('username', username)
      .single();

    // 3. 校验管理员是否存在
    if (error || !admin) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 4. 校验管理员状态
    if (admin.status !== 'active') {
      return NextResponse.json(
        { success: false, error: '账号已被禁用' },
        { status: 401 }
      );
    }

    // 5. 用bcryptjs正确比对密码（核心！）
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }

    // 6. 登录成功，返回凭证（和你之前的逻辑一致）
    return NextResponse.json({
      success: true,
      data: {
        token: admin.id, // 用管理员ID作为token（和你之前的逻辑一致）
        user: {
          id: admin.id,
          username: admin.username,
          role: admin.role
        }
      }
    }, { status: 200 });

  } catch (error) {
    console.error('登录接口报错：', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
