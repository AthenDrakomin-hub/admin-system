import { cache } from './vercel-kv';
import { fetchSinaQuote } from './sina-quote';
import { logAudit } from './audit';
import { supabase } from './supabase';

const CACHE_TTL = 300;
const FALLBACK_TTL = 3600;
const API_TIMEOUT = 5000;

export async function fetchMarketData(symbol: string) {
  try {
    const cached = await cache.get(`market:${symbol}`);
    if (cached) return cached;
    
    const quote = await Promise.race([
      fetchSinaQuote(symbol),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('API timeout')), API_TIMEOUT)
      )
    ]) as any;
    
    if (quote) {
      // 自动存入数据库（如果不存在）
      if (supabase && quote.name) {
        const market = symbol.startsWith('6') ? 'sh' : symbol.startsWith('0') || symbol.startsWith('3') ? 'sz' : 'hk';
        const currency = market === 'hk' ? 'HKD' : 'CNY';
        
        try {
          await supabase.from('stocks').upsert({
            symbol,
            name: quote.name,
            market,
            currency
          }, { onConflict: 'symbol' });
        } catch {}
      }
      
      await cache.set(`market:${symbol}`, quote, CACHE_TTL);
      await cache.set(`market:fallback:${symbol}`, quote, FALLBACK_TTL);
      return quote;
    }
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
