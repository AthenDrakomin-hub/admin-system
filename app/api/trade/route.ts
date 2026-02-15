import { NextRequest, NextResponse } from 'next/server';

/**
 * @deprecated 旧版交易审核API，已废弃
 * 请使用新版统一管理API：/api/admin/trade
 * 废弃原因：新版API提供更统一的接口、更好的权限控制和更完善的审计日志
 */

export async function GET(req: NextRequest) {
  console.warn('DEPRECATED: 旧版 /api/trade API被调用，请迁移到 /api/admin/trade');
  
  return NextResponse.json({
    success: false,
    error: 'API已废弃',
    message: '此API已废弃，请使用新版统一管理API：/api/admin/trade',
    migration_guide: {
      new_endpoint: '/api/admin/trade',
      parameter_changes: {
        old: 'trade_type=a-share',
        new: 'type=a_share'
      },
      authentication: '需要管理员权限和Bearer Token',
      documentation: '请参考新版API文档'
    }
  }, { status: 410 }); // 410 Gone - 资源已永久移除
}

export async function POST(req: NextRequest) {
  console.warn('DEPRECATED: 旧版 /api/trade API被调用，请迁移到 /api/admin/trade');
  
  return NextResponse.json({
    success: false,
    error: 'API已废弃',
    message: '此API已废弃，请使用新版统一管理API：/api/admin/trade',
    migration_guide: {
      new_endpoint: '/api/admin/trade',
      parameter_changes: {
        old: {
          orderId: '订单ID',
          action: '操作类型',
          adminId: '管理员ID',
          adminName: '管理员名称',
          reason: '原因'
        },
        new: {
          targetId: '目标ID',
          action: '操作类型 (approve/reject/cancel)',
          targetType: '目标类型 (order/block_order/ipo_application等)',
          adminId: '管理员ID',
          adminName: '管理员名称',
          reason: '原因'
        }
      },
      authentication: '需要管理员权限和Bearer Token',
      documentation: '请参考新版API文档'
    }
  }, { status: 410 }); // 410 Gone - 资源已永久移除
}
