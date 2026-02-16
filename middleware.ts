import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. 获取请求的 Origin 头（不管是什么源都允许）
  const origin = request.headers.get('origin') || '*';
  
  // 2. 构建宽松的 CORS 响应头（测试用）
  const responseHeaders = new Headers();
  responseHeaders.set('Access-Control-Allow-Origin', origin); // 允许当前请求的源
  responseHeaders.set('Access-Control-Allow-Credentials', 'true');
  responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  responseHeaders.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Cookie, X-Requested-With');
  responseHeaders.set('Access-Control-Max-Age', '86400');

  // 3. 处理预检请求
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: responseHeaders });
  }

  // 4. 正常请求
  const response = NextResponse.next();
  responseHeaders.forEach((value, key) => response.headers.set(key, value));
  return response;
}

export const config = { matcher: '/api/:path*' };