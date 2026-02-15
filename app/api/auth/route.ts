import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs'; // 使用 bcryptjs 而不是 bcrypt，因为项目已安装
import { supabase } from '@/lib/supabase'; // 你的supabase实例
import { generateToken } from '@/lib/auth'; // 导入generateToken生成JWT token

export async function POST(request: Request) {
  try {
    // 1. 打印请求体（确认前端传的参数正确）
    const body = await request.json();
    const { username, password } = body;
    
    console.log('===== 登录请求参数 =====');
    console.log('用户名:', username);
    console.log('密码明文:', password);
    console.log('参数是否完整:', !!username && !!password);

    // 2. 校验参数
    if (!username || !password) {
      console.log('参数校验失败：用户名或密码为空');
      return NextResponse.json(
        { success: false, error: '请输入用户名和密码' },
        { status: 400 }
      );
    }

    // 检查 supabase 实例是否可用
    if (!supabase) {
      console.log('Supabase实例不可用');
      return NextResponse.json(
        { success: false, error: '服务器配置错误' },
        { status: 500 }
      );
    }

    // 3. 查询管理员信息（打印查询结果）
    console.log('\n===== 查询Supabase admins表 =====');
    console.log('查询条件 - 用户名:', username);
    
    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, username, password_hash, role, status')
      .eq('username', username)
      .single();

    if (error || !admin) {
      console.log('查询失败:', error?.message || '管理员不存在');
      console.log('错误详情:', error);
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }
    
    console.log('查询到的管理员:', admin);
    console.log('管理员ID:', admin.id);
    console.log('管理员用户名:', admin.username);
    console.log('管理员角色:', admin.role);
    console.log('管理员状态:', admin.status);
    console.log('数据库密码哈希:', admin.password_hash);
    console.log('哈希长度:', admin.password_hash?.length);
    console.log('哈希前缀:', admin.password_hash?.substring(0, 10));

    // 4. 校验管理员状态（打印判断结果）
    console.log('\n===== 检查账号状态 =====');
    if (admin.status !== 'active') {
      console.log('账号状态非active，返回401');
      console.log('当前状态:', admin.status, '期望状态: active');
      return NextResponse.json(
        { success: false, error: '账号已被禁用' },
        { status: 401 }
      );
    }
    console.log('账号状态正常（active）');

    // 5. 用bcryptjs正确比对密码（核心！）
    console.log('\n===== 密码比对 =====');
    console.log('用户输入密码:', password);
    console.log('数据库哈希:', admin.password_hash);
    
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
    console.log('bcrypt.compare结果:', isPasswordValid);
    
    if (!isPasswordValid) {
      console.log('密码比对失败，返回401');
      return NextResponse.json(
        { success: false, error: '用户名或密码错误' },
        { status: 401 }
      );
    }
    console.log('密码比对成功');

    // 6. 生成JWT token（与verifyAdminAuth兼容）
    console.log('\n===== 生成JWT令牌 =====');
    const token = await generateToken({
      username: admin.username,
      role: admin.role
    });
    
    console.log('JWT令牌生成成功，长度:', token?.length);
    console.log('令牌前缀:', token?.substring(0, 20) + '...');

    // 7. 登录成功，返回凭证
    console.log('\n===== 登录成功 =====');
    console.log('返回管理员信息:', {
      id: admin.id,
      username: admin.username,
      role: admin.role
    });
    
    return NextResponse.json({
      success: true,
      data: {
        token: token, // 使用JWT token
        user: {
          id: admin.id,
          username: admin.username,
          role: admin.role
        }
      }
    }, { status: 200 });

  } catch (error) {
    console.log('\n===== 登录接口异常 =====');
    console.log('异常信息:', error);
    console.error('登录接口报错：', error);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}