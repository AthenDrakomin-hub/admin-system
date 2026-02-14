import { NextRequest, NextResponse } from 'next/server';
import { approveOrder, getPendingOrders } from '@/lib/order-service';
import { tradeAuditRules, validate } from '@/lib/validation';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tradeType = searchParams.get('trade_type') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const result = await getPendingOrders(tradeType, page, limit);
    return NextResponse.json({ 
      success: true, 
      data: result.data,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit)
      }
    });
  } catch (error: any) {
    console.error('GET /api/trade error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate parameters
    const validation = validate(body, tradeAuditRules);
    if (!validation.valid) {
      const errorMessage = validation.errors.map(e => `${e.field}: ${e.message}`).join('; ');
      console.error('Trade audit validation failed:', errorMessage);
      return NextResponse.json(
        { success: false, error: `参数验证失败: ${errorMessage}` },
        { status: 400 }
      );
    }
    
    const { orderId, action, adminId, adminName, reason } = body;
    
    // Log the operation
    console.log(`审核订单 ID: ${orderId}, 操作: ${action}, 管理员: ${adminName} (${adminId}), 理由: ${reason || '无'}`);
    
    await approveOrder(orderId, adminId, adminName, action, reason);
    
    // Log success
    console.log(`订单审核成功 ID: ${orderId}, 状态更新为: ${action}`);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('POST /api/trade error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
