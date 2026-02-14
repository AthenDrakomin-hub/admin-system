import { NextRequest } from 'next/server';
import { clientResponse } from '@/lib/client';

export async function GET(req: NextRequest) {
  // TODO: 获取用户资金/持仓信息
  return clientResponse({ 
    balance: 0, 
    frozen_balance: 0,
    positions: [] 
  });
}
