import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // TODO: 获取系统参数
  return NextResponse.json({ success: true, data: {} });
}

export async function POST(req: NextRequest) {
  // TODO: 更新系统参数
  return NextResponse.json({ success: true });
}
