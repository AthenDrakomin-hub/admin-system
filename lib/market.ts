// 简单的内存缓存（Vercel KV已废弃，使用内存缓存替代）
const memoryCache = new Map<string, { data: any; expiry: number }>();

const cache = {
  get: async (key: string) => {
    const item = memoryCache.get(key);
    if (item && item.expiry > Date.now()) {
      return item.data;
    }
    memoryCache.delete(key);
    return null;
  },
  set: async (key: string, data: any, ttl: number) => {
    memoryCache.set(key, { data, expiry: Date.now() + ttl * 1000 });
  }
};

import { logAudit } from './audit';
import { supabase } from './supabase';
import { getStockData } from './stock-data';

const CACHE_TTL = 300;
const FALLBACK_TTL = 3600;
const API_TIMEOUT = 5000;

export async function fetchMarketData(symbol: string) {
  try {
    const cached = await cache.get(`market:${symbol}`);
    if (cached) return cached;
    
    // 根据symbol判断市场类型
    const market = symbol.startsWith('6') ? 'CN' : 
                  (symbol.startsWith('0') || symbol.startsWith('3')) ? 'CN' : 'HK';
    
    // 使用新的稳定数据源
    const stockData = await getStockData(symbol, market);
    
    if (!stockData) {
      throw new Error('Failed to fetch stock data from Yahoo Finance');
    }
    
    // 映射数据格式（保持向后兼容）
    const quote = {
      symbol: stockData.symbol,
      name: stockData.name || '',
      price: stockData.price || 0,
      change: stockData.change || 0,
      changePercent: stockData.percentChange || 0,
      open: stockData.price || 0, // Yahoo Finance可能不返回开盘价，暂时用当前价格
      close: stockData.price || 0, // Yahoo Finance可能不返回收盘价，暂时用当前价格
      high: stockData.price || 0, // Yahoo Finance可能不返回最高价，暂时用当前价格
      low: stockData.price || 0, // Yahoo Finance可能不返回最低价，暂时用当前价格
      volume: 0, // Yahoo Finance可能不返回成交量
      amount: 0, // Yahoo Finance可能不返回成交额
      timestamp: stockData.timestamp || new Date().toISOString()
    };
    
    // 自动存入数据库（如果不存在）
    if (supabase && quote.symbol) {
      const dbMarket = symbol.startsWith('6') ? 'sh' : symbol.startsWith('0') || symbol.startsWith('3') ? 'sz' : 'hk';
      const currency = dbMarket === 'hk' ? 'HKD' : 'CNY';
      
      try {
        // 尝试从数据库获取股票名称
        const { data: stockData } = await supabase
          .from('stocks')
          .select('name')
          .eq('symbol', symbol)
          .single();
        
        if (stockData?.name) {
          quote.name = stockData.name;
        }
        
        // 更新或插入股票信息
        await supabase.from('stocks').upsert({
          symbol,
          name: quote.name,
          market: dbMarket,
          currency
        }, { onConflict: 'symbol' });
      } catch {}
    }
    
    await cache.set(`market:${symbol}`, quote, CACHE_TTL);
    await cache.set(`market:fallback:${symbol}`, quote, FALLBACK_TTL);
    return quote;
  } catch (error: any) {
    console.error('Market API error:', error.message);
    
    const fallback = await cache.get(`market:fallback:${symbol}`);
    if (fallback) {
      try {
        await logAudit(
          '行情接口失败，使用兜底缓存',
          'config_change',
          'system',
          'System',
          'config',
          'market',
          null,
          { symbol, error: error.message },
          '行情接口超时或失败'
        );
      } catch {}
      
      return fallback;
    }
  }
  
  return { symbol, price: 0, change: 0, name: '', error: 'No data available' };
}

// 获取股票行情
export async function getStockQuote(symbol: string) {
  return await fetchMarketData(symbol);
}

// 搜索股票
export async function searchStocks(keyword: string) {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('stocks')
    .select('*')
    .ilike('name', `%${keyword}%`)
    .limit(20);
  
  if (error) {
    console.error('搜索股票错误:', error);
    return [];
  }
  
  return data || [];
}

// 获取K线数据
export async function getKlineData(symbol: string, period: 'day' | 'week' | 'month' = 'day') {
  // 这里应该调用真实的K线数据API
  // 目前返回模拟数据
  return [
    { date: '2024-01-01', open: 100, high: 105, low: 98, close: 102, volume: 1000000 },
    { date: '2024-01-02', open: 102, high: 108, low: 101, close: 106, volume: 1200000 },
  ];
}

// 获取市场指数
export async function getMarketIndices() {
  // 返回主要市场指数
  const indices = [
    { symbol: '000001', name: '上证指数', price: 3000.50, change: 25.30, changePercent: 0.85 },
    { symbol: '399001', name: '深证成指', price: 9500.20, change: -15.80, changePercent: -0.17 },
    { symbol: '399006', name: '创业板指', price: 1800.75, change: 32.45, changePercent: 1.83 },
  ];
  
  // 获取实时数据
  const promises = indices.map(async (index) => {
    try {
      const data = await fetchMarketData(index.symbol);
      return { ...index, ...data };
    } catch {
      return index;
    }
  });
  
  return await Promise.all(promises);
}
