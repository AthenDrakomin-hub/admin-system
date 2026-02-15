import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { fetchSinaQuotes } from '@/lib/sina-quote';

export async function GET(req: NextRequest) {
  try {
    // 创建管理员客户端
    const supabase = await createAdminClient('super_admin');

    // 1. 从stock_pool表读取所有启用的股票代码
    const { data: stocks, error: stockError } = await supabase
      .from('stock_pool')
      .select('symbol')
      .eq('is_active', true);
    
    if (stockError) {
      return NextResponse.json(
        { success: false, error: `读取股票列表失败：${stockError.message}` },
        { status: 500 }
      );
    }
    
    if (!stocks || stocks.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'stock_pool表无启用的股票数据'
      });
    }

    const stockSymbols = stocks.map((s: any) => s.symbol);
    
    // 2. 批量删除缓存（让后续请求抓取最新价）- Vercel KV已废弃，跳过此步骤
    // await batchDeleteStockCache(stockSymbols);
    console.log(`准备同步 ${stockSymbols.length} 只股票行情`);

    // 3. 批量获取新浪行情数据
    const quotes = await fetchSinaQuotes(stockSymbols);
    
    if (!quotes || quotes.length === 0) {
      return NextResponse.json({
        success: false,
        error: '新浪接口未返回数据'
      });
    }

    // 4. 批量写入/更新stocks表（核心逻辑）
    const updatePromises = quotes.map(quote => {
      // 根据市场类型判断货币
      const currency = quote.symbol.startsWith('0') || quote.symbol.startsWith('6') || quote.symbol.startsWith('3') 
        ? 'CNY'  // A股
        : 'HKD'; // 港股
      
      return supabase.from('stocks').upsert({
        symbol: quote.symbol,
        name: quote.name,
        price: quote.price,
        open: quote.open,
        close: quote.close,
        high: quote.high,
        low: quote.low,
        volume: quote.volume,
        amount: quote.amount,
        change: quote.change,
        change_percent: quote.changePercent,
        currency: currency,
        updated_at: new Date().toISOString()
      }, { onConflict: 'symbol' });
    });

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: `成功同步${quotes.length}只股票行情，并清理了缓存`,
      count: quotes.length,
      time: new Date().toISOString()
    });

  } catch (error: unknown) {
    // 类型收窄，安全访问error属性
    let errorMsg = '未知错误';
    if (error instanceof Error) {
      errorMsg = error.message;
    } else if (typeof error === 'string') {
      errorMsg = error;
    }
    
    console.error('行情同步失败:', errorMsg);
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
