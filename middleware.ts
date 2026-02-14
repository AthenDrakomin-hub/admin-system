import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAuth } from '@/lib/auth';

const ALLOWED_CLIENT_ORIGIN = 'https://www.zhengyutouzi.com';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // 客户端API - 仅允许客户端域名访问
  if (pathname.startsWith('/api/client')) {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    
    // 检查来源
    const isAllowed = 
      origin === ALLOWED_CLIENT_ORIGIN || 
      referer?.startsWith(ALLOWED_CLIENT_ORIGIN);
    
    if (!isAllowed && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }
    
    // OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': ALLOWED_CLIENT_ORIGIN,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
