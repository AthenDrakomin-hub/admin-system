import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // TODO: 获取交易列表
  return NextResponse.json({ success: true, data: [] });
}

export async function POST(req: NextRequest) {
  // TODO: 审核交易
  return NextResponse.json({ success: true });
}
