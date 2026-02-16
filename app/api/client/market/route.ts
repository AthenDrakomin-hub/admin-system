import { NextRequest } from 'next/server';
import { clientResponse, clientError } from '@/lib/client';
import { getStockQuote, searchStocks, getKlineData, getMarketIndices } from '@/lib/market';

// 核心修复：强制该API路由动态渲染，避免静态生成时的错误
export const dynamic = 'force-dynamic';

/**
 * 行情API
 * GET /api/client/market?action=quote&symbol=000001
 * GET /api/client/market?action=search&keyword=茅台
 * GET /api/client/market?action=kline&symbol=000001&period=day
 * GET /api/client/market?action=indices
 */
export async function GET(req: NextRequest) {
  try {
    // 使用标准的URL解析方式替代nextUrl（更兼容）
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'quote';
    const symbol = searchParams.get('symbol') || '';
    const keyword = searchParams.get('keyword') || '';
    const period = searchParams.get('period') || 'day';

    switch (action) {
      case 'quote': {
        // 获取股票行情
        if (!symbol) {
          return clientError('缺少股票代码');
        }
        const quote = await getStockQuote(symbol);
        
        // 核心：数据结构映射转换（真实结构 → 期望的结构）
        const mappedData = {
          symbol: quote.symbol,
          name: quote.name,
          current_price: quote.price.toString(), // 转字符串匹配期望格式
          change: quote.change.toString(),
          change_percent: quote.changePercent.toString(),
          volume: quote.volume.toString(),
          amount: quote.amount.toString(),
          high: quote.high.toString(),
          low: quote.low.toString(),
          open: quote.open.toString(),
          close: quote.close.toString(),
          timestamp: quote.timestamp
        };
        
        return clientResponse(mappedData);
      }

      case 'search': {
        // 搜索股票
        if (!keyword) {
          return clientError('缺少搜索关键词');
        }
        const results = await searchStocks(keyword);
        return clientResponse({ results });
      }

      case 'kline': {
        // 获取K线数据
        if (!symbol) {
          return clientError('缺少股票代码');
        }
        const klines = await getKlineData(symbol, period as any);
        return clientResponse({ klines });
      }

      case 'indices': {
        // 获取市场指数
        const indices = await getMarketIndices();
        return clientResponse({ indices });
      }

      default:
        return clientError('不支持的操作类型');
    }
  } catch (error: any) {
    console.error('行情API错误:', error);
    return clientError('获取行情数据失败');
  }
}
