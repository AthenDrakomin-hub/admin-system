import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { kv } from '@vercel/kv';
import yahooFinance from 'yahoo-finance2';

export async function GET(
  request: Request,
  { params }: { params: { symbol: string } }
) {
  const { symbol } = params;
  const { searchParams } = new URL(request.url);
  const market = searchParams.get('market') || 'CN';

  // 验证市场类型（仅支持CN/HK）
  if (market !== 'CN' && market !== 'HK') {
    return Response.json({ error: 'Unsupported market type' }, { status: 400 });
  }

  // 1. 读取Supabase数据源配置
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );
  
  const { data: config } = await supabase
    .from('data_source_configs')
    .select('provider, cache_ttl, api_key')
    .eq('market_type', market)
    .eq('is_active', true)
    .single();

  if (!config) return Response.json({ error: 'No active data source' }, { status: 500 });

  // 2. 检查Vercel KV缓存
  const cacheKey = `ds:${market}:${symbol}`;
  const cachedData = await kv.get(cacheKey);
  if (cachedData) return Response.json(cachedData);

  // 3. 根据配置请求对应海外数据源
  let data;
  try {
    switch (config.provider) {
      case 'YAHOO_FINANCE':
        const querySymbol = market === 'CN' ? `${symbol}.SS` : `${symbol}.HK`;
        const quote = await yahooFinance.quote(querySymbol);
        data = {
          symbol,
          market,
          price: quote.regularMarketPrice,
          change: quote.regularMarketChange,
          percentChange: quote.regularMarketChangePercent,
          currency: quote.currency,
          updatedAt: new Date().toISOString(),
          provider: 'YAHOO_FINANCE'
        };
        break;
      // 后续切换付费数据源只需新增case，无需修改客户端
      case 'ALPHA_VANTAGE':
        // 付费数据源请求逻辑
        // 这里需要根据api_key调用Alpha Vantage API
        // 暂时返回占位数据
        data = {
          symbol,
          market,
          price: 0,
          change: 0,
          percentChange: 0,
          currency: market === 'CN' ? 'CNY' : 'HKD',
          updatedAt: new Date().toISOString(),
          provider: 'ALPHA_VANTAGE',
          note: 'Alpha Vantage integration pending'
        };
        break;
      default:
        return Response.json({ error: 'Unsupported provider' }, { status: 500 });
    }
  } catch (e) {
    console.error('Data source request failed:', e);
    return Response.json({ error: 'Data source request failed' }, { status: 502 });
  }

  // 4. 写入Vercel KV缓存
  await kv.set(cacheKey, data, { ex: config.cache_ttl });

  return Response.json(data);
}
