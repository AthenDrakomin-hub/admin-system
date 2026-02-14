import { NextRequest } from 'next/server';
import { clientResponse, clientError } from '@/lib/client';
import { createOrder } from '@/lib/order-service';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { userId, symbol, symbolName, tradeType, side, price, quantity } = await req.json();
    
    if (!userId || !symbol || !tradeType || !side || !price || !quantity) {
      return clientError('缺少必要参数');
    }
    
    const order = await createOrder(userId, {
      trade_type: tradeType,
      symbol,
      symbol_name: symbolName,
      side,
      price,
      quantity,
    });
    
    return clientResponse({ orderId: order.id, status: 'pending' });
  } catch (error: any) {
    return clientError(error.message);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return clientError('缺少用户ID');
    }
    
    if (!supabase) {
      return clientError('Database not configured');
    }
    
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    
    return clientResponse({ orders: orders || [] });
  } catch (error: any) {
    return clientError(error.message);
  }
}
