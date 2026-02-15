// 新浪财经免费行情接口
// 无需 API Key，完全免费
import iconv from 'iconv-lite';
import type { PostgrestError } from '@supabase/supabase-js';

// 简单的内存缓存替代方案
const stockCache = new Map<string, { data: any; expiry: number }>();

const getStockCache = async (key: string) => {
  const item = stockCache.get(key);
  if (item && item.expiry > Date.now()) {
    return item.data;
  }
  return null;
};

const setStockCache = async (key: string, data: any, ttl: number = 300) => {
  stockCache.set(key, { data, expiry: Date.now() + ttl * 1000 });
};

interface SinaQuote {
  symbol: string;
  name: string;
  price: number;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  amount: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

// 辅助函数：判断是否是核心股票（从stock_pool表查询）
async function isCoreStock(symbol: string): Promise<boolean> {
  try {
    // 导入 createAdminClient 函数
    const { createAdminClient } = await import('./supabase');
    
    // 创建管理员客户端（使用 super_admin 身份）
    const supabase = await createAdminClient('super_admin');
    
    const { data, error } = await supabase
      .from('stock_pool')
      .select('symbol')
      .eq('symbol', symbol)
      .eq('is_active', true)
      .limit(1);
    
    if (error) {
      console.error('Error checking core stock:', (error as PostgrestError).message || String(error));
      return false;
    }
    
    return !!data?.length;
  } catch (error: unknown) {
    // 类型收窄，安全访问error属性
    if (error instanceof Error) {
      console.error('Error in isCoreStock:', error.message);
    } else {
      console.error('Error in isCoreStock:', String(error));
    }
    return false;
  }
}

// 新浪财经实时行情接口（带KV缓存）
export async function fetchSinaQuote(symbol: string): Promise<SinaQuote | null> {
  // 第一步：先查KV缓存
  const cacheData = await getStockCache(symbol);
  if (cacheData) {
    console.log(`[缓存命中] ${symbol}`);
    return cacheData as SinaQuote;
  }
  
  console.log(`[缓存未命中] 抓取${symbol}实时行情`);
  
  try {
    const sinaSymbol = convertToSinaSymbol(symbol);
    const url = `https://hq.sinajs.cn/list=${sinaSymbol}`;
    
    const response = await fetch(url, {
      headers: {
        'Referer': 'https://finance.sina.com.cn',
      },
      next: { revalidate: 0 }
    });
    
    const buffer = await response.arrayBuffer();
    const text = iconv.decode(Buffer.from(buffer), 'gbk');
    
    const match = text.match(/="(.+)"/);
    if (!match) return null;
    
    const data = match[1].split(',');
    
    let quote: SinaQuote | null = null;
    
    if (sinaSymbol.startsWith('sh') || sinaSymbol.startsWith('sz')) {
      quote = parseAShareData(symbol, data);
    } else if (sinaSymbol.startsWith('hk')) {
      quote = parseHKShareData(symbol, data);
    }
    
    if (!quote) return null;
    
    // 第三步：写入KV缓存（核心股5分钟，非核心股1分钟）
    const isCore = await isCoreStock(symbol);
    const ttl = isCore ? 300 : 60; // 核心股5分钟，非核心股1分钟
    await setStockCache(symbol, quote, ttl);
    
    return quote;
  } catch (error: unknown) {
    // 类型收窄，安全访问error属性
    if (error instanceof Error) {
      console.error('Fetch Sina quote error:', error.message);
    } else {
      console.error('Fetch Sina quote error:', String(error));
    }
    return null;
  }
}

// 批量获取行情
export async function fetchSinaQuotes(symbols: string[]): Promise<SinaQuote[]> {
  const sinaSymbols = symbols.map(convertToSinaSymbol).join(',');
  
  try {
    const url = `https://hq.sinajs.cn/list=${sinaSymbols}`;
    
    const response = await fetch(url, {
      headers: {
        'Referer': 'https://finance.sina.com.cn',
      },
      next: { revalidate: 0 }
    });
    
    const buffer = await response.arrayBuffer();
    const text = iconv.decode(Buffer.from(buffer), 'gbk');
    const lines = text.split('\n').filter(line => line.trim());
    
    const quotes: SinaQuote[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/="(.+)"/);
      if (!match) continue;
      
      const data = match[1].split(',');
      const symbol = symbols[i];
      const sinaSymbol = convertToSinaSymbol(symbol);
      
      let quote: SinaQuote | null = null;
      
      if (sinaSymbol.startsWith('sh') || sinaSymbol.startsWith('sz')) {
        quote = parseAShareData(symbol, data);
      } else if (sinaSymbol.startsWith('hk')) {
        quote = parseHKShareData(symbol, data);
      }
      
      if (quote) quotes.push(quote);
    }
    
    return quotes;
  } catch (error: unknown) {
    // 类型收窄，安全访问error属性
    if (error instanceof Error) {
      console.error('Fetch Sina quotes error:', error.message);
    } else {
      console.error('Fetch Sina quotes error:', String(error));
    }
    return [];
  }
}

// 转换为新浪股票代码格式
function convertToSinaSymbol(symbol: string): string {
  // A股：600000 -> sh600000, 000001 -> sz000001
  if (/^6\d{5}$/.test(symbol)) {
    return `sh${symbol}`;
  }
  if (/^(0|3)\d{5}$/.test(symbol)) {
    return `sz${symbol}`;
  }
  
  // 港股：00700 -> hk00700
  if (/^\d{5}$/.test(symbol)) {
    return `hk${symbol}`;
  }
  
  return symbol;
}

// 解析A股数据
function parseAShareData(symbol: string, data: string[]): SinaQuote {
  const name = data[0];
  const open = parseFloat(data[1]);
  const close = parseFloat(data[2]);
  const price = parseFloat(data[3]);
  const high = parseFloat(data[4]);
  const low = parseFloat(data[5]);
  const volume = parseInt(data[8]);
  const amount = parseFloat(data[9]);
  
  const change = price - close;
  const changePercent = close > 0 ? (change / close) * 100 : 0;
  
  return {
    symbol,
    name,
    price,
    open,
    close,
    high,
    low,
    volume,
    amount,
    change,
    changePercent,
    timestamp: new Date().toISOString(),
  };
}

// 解析港股数据
function parseHKShareData(symbol: string, data: string[]): SinaQuote {
  const name = data[1];
  const open = parseFloat(data[2]);
  const close = parseFloat(data[3]);
  const price = parseFloat(data[6]);
  const high = parseFloat(data[4]);
  const low = parseFloat(data[5]);
  const volume = parseInt(data[12]);
  const amount = parseFloat(data[11]);
  
  const change = price - close;
  const changePercent = close > 0 ? (change / close) * 100 : 0;
  
  return {
    symbol,
    name,
    price,
    open,
    close,
    high,
    low,
    volume,
    amount,
    change,
    changePercent,
    timestamp: new Date().toISOString(),
  };
}

// 搜索股票
export async function searchStock(keyword: string): Promise<Array<{ symbol: string; name: string; type: string }>> {
  try {
    const url = `https://suggest3.sinajs.cn/suggest/type=11,12,13,14,15&key=${encodeURIComponent(keyword)}`;
    
    const response = await fetch(url);
    const text = await response.text();
    
    // 解析搜索结果
    const match = text.match(/="(.+)"/);
    if (!match) return [];
    
    const items = match[1].split(';').filter(item => item);
    
    return items.map(item => {
      const parts = item.split(',');
      return {
        symbol: parts[2],
        name: parts[4],
        type: parts[0].includes('sh') || parts[0].includes('sz') ? 'A股' : '港股',
      };
    });
  } catch (error: unknown) {
    // 类型收窄，安全访问error属性
    if (error instanceof Error) {
      console.error('Search stock error:', error.message);
    } else {
      console.error('Search stock error:', String(error));
    }
    return [];
  }
}

// 从 Supabase 读取所有启用的股票（从 stock_pool 表）
export async function getAllStockSymbols() {
  try {
    // 导入 createAdminClient 函数
    const { createAdminClient } = await import('./supabase');
    
    // 创建管理员客户端（使用 super_admin 身份）
    const supabase = await createAdminClient('super_admin');
    
    // 从 stock_pool 表读取所有启用的股票
    const { data, error } = await supabase
      .from('stock_pool')
      .select('symbol, market')
      .eq('is_active', true)
      .order('symbol');
    
    if (error) {
      console.error('Error fetching stocks from stock_pool:', (error as PostgrestError).message || String(error));
      return [];
    }
    
    return data || [];
  } catch (error: unknown) {
    // 类型收窄，安全访问error属性
    if (error instanceof Error) {
      console.error('Error in getAllStockSymbols:', error.message);
    } else {
      console.error('Error in getAllStockSymbols:', String(error));
    }
    return [];
  }
}

// 全市场行情同步
export async function syncAllMarketData() {
  try {
    const stocks = await getAllStockSymbols();
    
    if (stocks.length === 0) {
      console.log('No stocks found to sync');
      return;
    }
    
    console.log(`开始同步 ${stocks.length} 只股票行情...`);
    
    // 串行抓取，避免超时/被封IP
    for (const stock of stocks) {
      try {
        // 导入 fetchMarketData 函数
        const { fetchMarketData } = await import('./market');
        
        // 获取行情数据（fetchMarketData 会自动保存到数据库）
        await fetchMarketData(stock.symbol);
        console.log(`✓ ${stock.symbol} 同步成功`);
      } catch (error: unknown) {
        // 类型收窄，安全访问error属性
        if (error instanceof Error) {
          console.error(`✗ ${stock.symbol} 同步失败:`, error.message);
        } else {
          console.error(`✗ ${stock.symbol} 同步失败:`, String(error));
        }
      }
      
      // 限流，关键！
      await new Promise(r => setTimeout(r, 300));
    }
    
    console.log('全市场行情同步完成！');
  } catch (error: unknown) {
    // 类型收窄，安全访问error属性
    if (error instanceof Error) {
      console.error('Error in syncAllMarketData:', error.message);
    } else {
      console.error('Error in syncAllMarketData:', String(error));
    }
  }
}
