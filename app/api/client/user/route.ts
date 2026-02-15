import { NextRequest } from 'next/server';
import { clientResponse, clientError } from '@/lib/client';

/**
 * 客户端用户API - 代理到统一用户API
 * 保持向后兼容性
 */
export async function GET(req: NextRequest) {
  try {
    // 转发请求到统一用户API
    const url = new URL(req.url);
    url.pathname = '/api/user';
    url.searchParams.set('action', 'profile');
    
    // 保留认证头
    const headers = new Headers();
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      headers.set('Authorization', authHeader);
    }
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers
    });
    
    const data = await response.json();
    
    if (data.success) {
      return clientResponse({
        user: data.data.user,
        balance: data.data.balances.cny.available,
        frozen_balance: data.data.balances.cny.frozen,
        positions: [] // 持仓需要单独获取
      });
    } else {
      return clientError(data.error || '获取用户信息失败');
    }
  } catch (error: any) {
    console.error('客户端用户API错误:', error);
    return clientError('获取用户信息失败');
  }
}
