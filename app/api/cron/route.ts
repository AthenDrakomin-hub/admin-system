import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // TODO: 实现行情刷新逻辑
  return NextResponse.json({ success: true, message: '行情刷新完成' });
}
