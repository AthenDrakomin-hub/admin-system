import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // TODO: 获取充值/提现列表
  return NextResponse.json({ success: true, data: [] });
}

export async function POST(req: NextRequest) {
  // TODO: 审核充值/提现
  return NextResponse.json({ success: true });
}
