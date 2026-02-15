import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAuth, verifyAdminAuth } from '@/lib/auth';
import { validateAdminAction } from '@/types/admin';

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
  
  // 管理员API - 权限验证
  if (pathname.startsWith('/api/admin')) {
    // 跳过OPTIONS预检请求
    if (request.method === 'OPTIONS') {
      return NextResponse.next();
    }
    
    // 验证Authorization头
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '未授权访问' },
        { status: 401 }
      );
    }
    
    // 验证管理员token
    const token = authHeader.substring(7);
    const admin = await verifyAdminAuth(token);
    
    if (!admin) {
      return NextResponse.json(
        { success: false, error: '无效的管理员认证' },
        { status: 401 }
      );
    }
    
    // 检查管理员状态
    if (admin.role === 'disabled') {
      return NextResponse.json(
        { success: false, error: '管理员账号已禁用' },
        { status: 403 }
      );
    }
    
    // 根据API路径检查具体权限
    const action = getActionFromMethod(request.method);
    const resource = getResourceFromPath(pathname);
    
    if (action && resource && admin.permissions) {
      const validation = validateAdminAction(admin.permissions, action, resource);
      
      if (!validation.allowed) {
        return NextResponse.json(
          { 
            success: false, 
            error: validation.reason || '无权限执行此操作' 
          },
          { status: 403 }
        );
      }
    }
    
    // 将管理员信息添加到请求头，供后续处理使用
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-admin-id', admin.id);
    requestHeaders.set('x-admin-username', admin.username);
    requestHeaders.set('x-admin-role', admin.role);
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
  
  return NextResponse.next();
}

// 根据HTTP方法获取操作类型
function getActionFromMethod(method: string): string {
  switch (method) {
    case 'GET':
      return 'view';
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return '';
  }
}

// 根据API路径获取资源类型
function getResourceFromPath(pathname: string): string {
  // 交易管理相关API
  if (pathname.includes('/admin/trade') || pathname.includes('/trade/')) {
    return 'trade_management';
  }
  
  // 用户管理相关API
  if (pathname.includes('/admin/user') || pathname.includes('/user/')) {
    return 'user_management';
  }
  
  // 财务管理相关API
  if (pathname.includes('/admin/finance') || pathname.includes('/finance/')) {
    return 'finance_management';
  }
  
  // 行情管理相关API
  if (pathname.includes('/admin/market') || pathname.includes('/market/')) {
    return 'market_management';
  }
  
  // 系统管理相关API
  if (pathname.includes('/admin/system') || pathname.includes('/system/')) {
    return 'system_management';
  }
  
  // 报表查看相关API
  if (pathname.includes('/admin/reports') || pathname.includes('/reports/')) {
    return 'report_view';
  }
  
  // 风控管理相关API
  if (pathname.includes('/admin/risk') || pathname.includes('/risk/')) {
    return 'risk_management';
  }
  
  // 管理员管理相关API
  if (pathname.includes('/admin/admins') || pathname.includes('/admins/')) {
    return 'admin_management';
  }
  
  // 审计日志相关API
  if (pathname.includes('/admin/audit') || pathname.includes('/audit/')) {
    return 'audit_log_view';
  }
  
  // 数据导出相关API
  if (pathname.includes('/export') || pathname.includes('/download')) {
    return 'data_export';
  }
  
  return 'admin_api';
}

export const config = {
  matcher: ['/api/:path*'],
};
