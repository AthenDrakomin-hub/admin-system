import { NextRequest, NextResponse } from 'next/server';
import { fetchMarketData, getStockQuote, searchStocks, getKlineData, getMarketIndices } from '@/lib/market';

// 核心修复：强制该API路由动态渲染，避免静态生成时的错误
export const dynamic = 'force-dynamic';

/**
 * 统一行情API - 整合客户端和管理端需求
 * 支持多种操作模式：
 * GET /api/market?action=quote&symbol=000001
 * GET /api/market?action=search&keyword=茅台
 * GET /api/market?action=kline&symbol=000001&period=day
 * GET /api/market?action=indices
 * GET /api/market?symbol=000001 (兼容旧格式)
 * GET /api/market?symbols=000001,000002 (批量获取)
 * GET /api/market?search=茅台 (搜索模式)
 */
export async function GET(req: NextRequest) {
  try {
    // 使用标准的URL解析方式（更兼容）
    const { searchParams } = new URL(req.url);
    
    // 支持新的action参数模式
    const action = searchParams.get('action') || 'quote';
    const symbol = searchParams.get('symbol') || '';
    const symbols = searchParams.get('symbols') || '';
    const keyword = searchParams.get('keyword') || '';
    const search = searchParams.get('search') || '';
    const period = searchParams.get('period') || 'day';
    
    // 兼容旧的查询参数格式
    const legacySymbol = searchParams.get('symbol');
    const legacySymbols = searchParams.get('symbols');
    const legacySearch = searchParams.get('search');
    
    // 搜索模式优先
    if (search || legacySearch) {
      const searchTerm = search || legacySearch || '';
      const results = await searchStocks(searchTerm);
      return NextResponse.json({ 
        success: true, 
        data: results,
        action: 'search',
        keyword: searchTerm
      });
    }
    
    // 批量获取模式
    const symbolParam = symbols || legacySymbols;
    if (symbolParam) {
      const symbolList = symbolParam.split(',');
      const quotes = await Promise.all(
        symbolList.map(s => fetchMarketData(s.trim()))
      );
      return NextResponse.json({ 
        success: true, 
        data: quotes,
        action: 'batch',
        count: quotes.length
      });
    }
    
    // Action-based操作
    switch (action) {
      case 'quote': {
        // 获取股票行情
        const targetSymbol = symbol || legacySymbol;
        if (!targetSymbol) {
          return NextResponse.json({ 
            success: false, 
            error: '缺少股票代码',
            action: 'quote'
          }, { status: 400 });
        }
        const quote = await getStockQuote(targetSymbol);
        return NextResponse.json({ 
          success: true, 
          data: quote,
          action: 'quote',
          symbol: targetSymbol
        });
      }
      
      case 'search': {
        // 搜索股票
        const searchTerm = keyword || search;
        if (!searchTerm) {
          return NextResponse.json({ 
            success: false, 
            error: '缺少搜索关键词',
            action: 'search'
          }, { status: 400 });
        }
        const results = await searchStocks(searchTerm);
        return NextResponse.json({ 
          success: true, 
          data: results,
          action: 'search',
          keyword: searchTerm
        });
      }
      
      case 'kline': {
        // 获取K线数据
        const targetSymbol = symbol || legacySymbol;
        if (!targetSymbol) {
          return NextResponse.json({ 
            success: false, 
            error: '缺少股票代码',
            action: 'kline'
          }, { status: 400 });
        }
        const klines = await getKlineData(targetSymbol, period as any);
        return NextResponse.json({ 
          success: true, 
          data: klines,
          action: 'kline',
          symbol: targetSymbol,
          period
        });
      }
      
      case 'indices': {
        // 获取市场指数
        const indices = await getMarketIndices();
        return NextResponse.json({ 
          success: true, 
          data: indices,
          action: 'indices'
        });
      }
      
      default:
        // 默认单个行情获取（兼容旧格式）
        const targetSymbol = symbol || legacySymbol;
        if (!targetSymbol) {
          return NextResponse.json({ 
            success: false, 
            error: '缺少股票代码'
          }, { status: 400 });
        }
        
        const quote = await fetchMarketData(targetSymbol);
        
        if (!quote || quote.error) {
          return NextResponse.json({ 
            success: false, 
            error: '行情数据不可用，请稍后重试',
            data: quote 
          }, { status: 503 });
        }
        
        return NextResponse.json({ 
          success: true, 
          data: quote,
          action: 'quote',
          symbol: targetSymbol
        });
    }
  } catch (error: any) {
    console.error('统一行情API错误:', error);
    return NextResponse.json({ 
      success: false, 
      error: '服务器错误，请稍后重试',
      message: error.message 
    }, { status: 500 });
  }
}
