import { NextRequest, NextResponse } from 'next/server';
import { fetchMarketData } from '@/lib/market';
import { fetchSinaQuotes, searchStock } from '@/lib/sina-quote';

// 获取单个股票行情
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  const symbols = req.nextUrl.searchParams.get('symbols');
  const search = req.nextUrl.searchParams.get('search');
  
  try {
    // 搜索股票
    if (search) {
      const results = await searchStock(search);
      return NextResponse.json({ success: true, data: results });
    }
    
    // 批量获取
    if (symbols) {
      const symbolList = symbols.split(',');
      const quotes = await Promise.all(
        symbolList.map(s => fetchMarketData(s))
      );
      return NextResponse.json({ success: true, data: quotes });
    }
    
    // 单个获取
    if (!symbol) {
      return NextResponse.json({ success: false, error: '缺少股票代码' }, { status: 400 });
    }
    
    const quote = await fetchMarketData(symbol);
    
    if (!quote || quote.error) {
      return NextResponse.json({ 
        success: false, 
        error: '行情数据不可用，请稍后重试',
        data: quote 
      }, { status: 503 });
    }
    
    return NextResponse.json({ success: true, data: quote });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误，请稍后重试',
      message: error.message 
    }, { status: 500 });
  }
}
