import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { fetchSinaQuote } from '@/lib/sina-quote';
import type { PostgrestError } from '@supabase/supabase-js';

// 用户搜索股票：支持代码/名称，不存在则自动抓取并入库
export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get('keyword');
  if (!keyword) {
    return NextResponse.json({ success: false, msg: '请输入股票代码或名称' }, { status: 400 });
  }

  const supabase = await createAdminClient('super_admin');

  // 1. 先在本地 stock_pool 里搜
  const { data: localStock, error } = await supabase
    .from('stock_pool')
    .select('*')
    .or(`symbol.ilike.%${keyword}%,name.ilike.%${keyword}%`)
    .limit(10);

  if (error) {
    console.error('Error searching stock_pool:', (error as PostgrestError).message || String(error));
  }

  if (localStock && localStock.length > 0) {
    // 本地有 → 直接返回
    return NextResponse.json({ success: true, data: localStock });
  }

  // 2. 本地没有 → 去新浪实时抓取
  const realtimeQuote = await fetchSinaQuote(keyword);
  if (!realtimeQuote || !realtimeQuote.symbol) {
    return NextResponse.json({ success: false, msg: '未找到该股票' }, { status: 404 });
  }

  // 3. 确定市场类型
  let market = 'sh'; // 默认
  const symbol = realtimeQuote.symbol;
  if (symbol.startsWith('6')) {
    market = 'sh';
  } else if (symbol.startsWith('0') || symbol.startsWith('3')) {
    market = 'sz';
  } else if (/^\d{5}$/.test(symbol)) {
    market = 'hk';
  }

  // 4. 抓到了 → 自动加入 stock_pool（以后就不用再爬）
  const { error: insertError } = await supabase.from('stock_pool').upsert({
    symbol: realtimeQuote.symbol,
    name: realtimeQuote.name,
    market: market,
    is_active: true,
    updated_at: new Date().toISOString()
  }, { onConflict: 'symbol' });

  if (insertError) {
    console.error('Error inserting into stock_pool:', (insertError as PostgrestError).message || String(insertError));
  }

  // 5. 返回给前端
  return NextResponse.json({
    success: true,
    data: [{
      symbol: realtimeQuote.symbol,
      name: realtimeQuote.name,
      market: market,
      is_active: true
    }],
    msg: '已从市场获取实时数据'
  });
}
