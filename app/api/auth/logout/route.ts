import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // 创建响应并设置清除cookie的header
    const response = NextResponse.json(
      { success: true, message: '登出成功' },
      { status: 200 }
    );

    // 清除admin_token cookie
    response.cookies.set({
      name: 'admin_token',
      value: '',
      expires: new Date(0),
      path: '/',
    });

    // 清除其他可能的认证cookie
    response.cookies.set({
      name: 'token',
      value: '',
      expires: new Date(0),
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('登出错误:', error);
    return NextResponse.json(
      { success: false, error: '登出失败' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // 创建重定向响应并清除cookie
  const response = NextResponse.redirect(new URL('/login', 'http://localhost:3000'));
  
  // 清除admin_token cookie
  response.cookies.set({
    name: 'admin_token',
    value: '',
    expires: new Date(0),
    path: '/',
  });

  // 清除其他可能的认证cookie
  response.cookies.set({
    name: 'token',
    value: '',
    expires: new Date(0),
    path: '/',
  });

  return response;
}
