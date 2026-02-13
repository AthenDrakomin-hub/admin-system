import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // TODO: 获取用户列表
  return NextResponse.json({ success: true, data: [] });
}

export async function POST(req: NextRequest) {
  // TODO: 创建/编辑用户
  return NextResponse.json({ success: true });
}
