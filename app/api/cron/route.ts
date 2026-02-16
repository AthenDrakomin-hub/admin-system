import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
    
    console.log(`准备同步 ${stockSymbols.length} 只股票行情`);

    // 3. 批量获取数据源行情数据
    const quotes = [];
    
    for (const symbol of stockSymbols) {
      try {
        // 根据symbol判断市场类型
        const market = symbol.startsWith('6') || symbol.startsWith('0') || symbol.startsWith('3') ? 'CN' : 'HK';
        
        // 调用数据源API
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/data-source/${symbol}?market=${market}`, {
          next: { revalidate: 0 }
        });
        
        if (!response.ok) {
          console.warn(`数据源API请求失败 for ${symbol}: ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        
        if (!data || data.error) {
          console.warn(`数据源API返回错误 for ${symbol}: ${data?.error || '未知错误'}`);
          continue;
        }
        
        // 映射数据格式
        const quote = {
          symbol: data.symbol,
          name: '', // 数据源API可能不返回名称
          price: data.price || 0,
          change: data.change || 0,
          changePercent: data.percentChange || 0,
          open: data.price || 0, // 数据源API可能不返回开盘价，暂时用当前价格
          close: data.price || 0, // 数据源API可能不返回收盘价，暂时用当前价格
          high: data.price || 0, // 数据源API可能不返回最高价，暂时用当前价格
          low: data.price || 0, // 数据源API可能不返回最低价，暂时用当前价格
          volume: 0, // 数据源API可能不返回成交量
          amount: 0, // 数据源API可能不返回成交额
          timestamp: data.updatedAt || new Date().toISOString()
        };
        
        quotes.push(quote);
        
        // 添加延迟以避免速率限制
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        console.error(`获取股票 ${symbol} 数据失败:`, error.message);
      }
    }
    
    if (quotes.length === 0) {
      return NextResponse.json({
        success: false,
        error: '数据源接口未返回有效数据'
      });
    }

    // 4. 批量写入/更新stocks表（核心逻辑）
    const updatePromises = quotes.map(quote => {
      // 根据市场类型判断货币
      const currency = quote.symbol.startsWith('0') || quote.symbol.startsWith('6') || quote.symbol.startsWith('3') 
        ? 'CNY'  // A股
        : 'HKD'; // 港股
      
      // 尝试从数据库获取股票名称
      return (async () => {
        try {
          const { data: stockData } = await supabase
            .from('stocks')
            .select('name')
            .eq('symbol', quote.symbol)
            .single();
          
          if (stockData?.name) {
            quote.name = stockData.name;
          }
        } catch {}
        
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
      })();
    });

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: `成功同步${quotes.length}只股票行情`,
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
