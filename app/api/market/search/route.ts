import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import type { PostgrestError } from '@supabase/supabase-js';

// 用户搜索股票：支持代码/名称，不存在则尝试从数据源获取
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

  // 2. 本地没有 → 尝试从数据源API获取（假设keyword是股票代码）
  // 首先判断市场类型
  let market = 'CN'; // 默认A股
  let symbol = keyword;
  if (symbol.startsWith('6') || symbol.startsWith('0') || symbol.startsWith('3')) {
    market = 'CN';
  } else if (/^\d{5}$/.test(symbol)) {
    market = 'HK';
  } else {
    // 如果不是有效的股票代码格式，直接返回未找到
    return NextResponse.json({ success: false, msg: '未找到该股票，请输入有效的股票代码' }, { status: 404 });
  }

  try {
    // 调用数据源API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/data-source/${symbol}?market=${market}`, {
      next: { revalidate: 0 }
    });
    
    if (!response.ok) {
      throw new Error(`Data source API failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data || data.error) {
      return NextResponse.json({ success: false, msg: '未找到该股票' }, { status: 404 });
    }
    
    // 3. 确定数据库市场类型
    let dbMarket = 'sh'; // 默认
    if (symbol.startsWith('6')) {
      dbMarket = 'sh';
    } else if (symbol.startsWith('0') || symbol.startsWith('3')) {
      dbMarket = 'sz';
    } else if (/^\d{5}$/.test(symbol)) {
      dbMarket = 'hk';
    }
    
    // 4. 获取到了 → 自动加入 stock_pool
    const { error: insertError } = await supabase.from('stock_pool').upsert({
      symbol: data.symbol,
      name: data.symbol, // 数据源API可能不返回名称，暂时用symbol
      market: dbMarket,
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
        symbol: data.symbol,
        name: data.symbol, // 数据源API可能不返回名称，暂时用symbol
        market: dbMarket,
        is_active: true
      }],
      msg: '已从数据源获取实时数据'
    });
  } catch (error: any) {
    console.error('Error fetching from data source:', error);
    return NextResponse.json({ success: false, msg: '数据源请求失败，请稍后重试' }, { status: 500 });
  }
}
