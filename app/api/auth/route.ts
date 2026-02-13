import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  
  // TODO: 实现登录逻辑
  if (username === 'admin' && password === 'admin123') {
    return NextResponse.json({ success: true, token: 'mock-token' });
  }
  
  return NextResponse.json({ success: false, error: '用户名或密码错误' }, { status: 401 });
}
