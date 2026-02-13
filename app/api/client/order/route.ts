import { NextRequest } from 'next/server';
import { clientResponse, clientError } from '@/lib/client';

export async function POST(req: NextRequest) {
  const { symbol, type, price, quantity } = await req.json();
  
  if (!symbol || !type || !price || !quantity) {
    return clientError('缺少必要参数');
  }
  
  // TODO: 实现订单创建逻辑
  return clientResponse({ orderId: '123456' });
}

export async function GET(req: NextRequest) {
  // TODO: 获取订单列表
  return clientResponse({ orders: [] });
}
