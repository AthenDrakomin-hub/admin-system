import { NextRequest } from 'next/server';
import { clientResponse, clientError } from '@/lib/client';
import { getStockQuote, searchStocks, getKlineData, getMarketIndices } from '@/lib/market';

/**
 * 行情API
 * GET /api/client/market?action=quote&symbol=000001
 * GET /api/client/market?action=search&keyword=茅台
 * GET /api/client/market?action=kline&symbol=000001&period=day
 * GET /api/client/market?action=indices
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
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
        return clientResponse({ quote });
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
