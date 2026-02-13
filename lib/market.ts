import { cache } from './vercel-kv';

export async function fetchMarketData(symbol: string) {
  const cached = await cache.get(`market:${symbol}`);
  if (cached) return cached;
  
  // TODO: 实现实际行情拉取逻辑
  const data = { symbol, price: 0, change: 0 };
  await cache.set(`market:${symbol}`, data, 300);
  return data;
}
