import { NextRequest } from 'next/server';
import { clientResponse, clientError } from '@/lib/client';

export async function POST(req: NextRequest) {
  const { type, amount } = await req.json();
  
  if (!type || !amount) {
    return clientError('缺少必要参数');
  }
  
  // TODO: 实现充值/提现逻辑
  return clientResponse({ success: true });
}

export async function GET(req: NextRequest) {
  // TODO: 获取流水记录
  return clientResponse({ flows: [] });
}
