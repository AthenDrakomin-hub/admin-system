import { NextRequest, NextResponse } from 'next/server';
import { fetchMarketData } from '@/lib/market';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  if (!symbol) {
    return NextResponse.json({ success: false, error: '缺少股票代码' }, { status: 400 });
  }
  
  const data = await fetchMarketData(symbol);
  return NextResponse.json({ success: true, data });
}
