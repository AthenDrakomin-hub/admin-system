// lib/stock-data.ts
import yahooFinance from 'yahoo-finance2';
import { kv } from '@vercel/kv';

// 映射A股代码到Yahoo Finance格式
const mapCnSymbol = (symbol: string) => {
  if (symbol.startsWith('6')) return `${symbol}.SS`; // 沪市
  if (symbol.startsWith('0') || symbol.startsWith('3')) return `${symbol}.SZ`; // 深市/创业板
  return symbol;
};

// 映射港股代码到Yahoo Finance格式
const mapHkSymbol = (symbol: string) => {
  return symbol.endsWith('.HK') ? symbol : `${symbol}.HK`;
};

// 获取股票数据（带Vercel KV缓存）
export async function getStockData(symbol: string, market: 'CN' | 'HK' | 'US' = 'CN') {
  const cacheKey = `stock:${market}:${symbol}`;
  
  // 1. 先查缓存
  try {
    const cachedData = await kv.get(cacheKey);
    if (cachedData) return cachedData;
  } catch (error) {
    console.warn('KV cache error:', error);
    // 继续执行，不因缓存错误而中断
  }

  try {
    // 2. 根据市场类型处理股票代码
    let querySymbol: string;
    if (market === 'CN') querySymbol = mapCnSymbol(symbol);
    else if (market === 'HK') querySymbol = mapHkSymbol(symbol);
    else querySymbol = symbol;

    // 3. 调用Yahoo Finance API
    const quote = await yahooFinance.quote(querySymbol);
    if (!quote) throw new Error('Stock data not found');

    // 4. 格式化返回数据
    const result = {
      symbol,
      market,
      name: quote.shortName || quote.longName || symbol,
      price: quote.regularMarketPrice || 0,
      change: quote.regularMarketChange || 0,
      percentChange: quote.regularMarketChangePercent || 0,
      currency: quote.currency || 'CNY',
      timestamp: quote.regularMarketTime || Date.now(),
      source: 'Yahoo Finance'
    };

    // 5. 缓存数据（15分钟）
    try {
      await kv.set(cacheKey, result, { ex: 900 });
    } catch (error) {
      console.warn('Failed to cache stock data:', error);
    }
    
    return result;
  } catch (error) {
    console.error(`Failed to fetch ${symbol} data:`, error);
    return null;
  }
}

// 批量获取股票数据
export async function getBatchStockData(symbols: string[], market: 'CN' | 'HK' | 'US' = 'CN') {
  const results = await Promise.all(
    symbols.map(symbol => getStockData(symbol, market))
  );
  return results.filter(Boolean);
}
