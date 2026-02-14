import { NextRequest, NextResponse } from 'next/server';
import { approveRecharge, approveWithdraw, getPendingRecharges, getPendingWithdraws } from '@/lib/finance';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    let result;
    if (type === 'recharge') {
      result = await getPendingRecharges(page, limit);
    } else if (type === 'withdraw') {
      result = await getPendingWithdraws(page, limit);
    } else {
      return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 });
    }
    
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { type, requestId, action, adminId, adminName, reason } = await req.json();
    
    if (!type || !requestId || !action || !adminId || !adminName) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }
    
    let result;
    if (type === 'recharge') {
      result = await approveRecharge(requestId, adminId, adminName, action, reason);
    } else if (type === 'withdraw') {
      result = await approveWithdraw(requestId, adminId, adminName, action, reason);
    } else {
      return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 });
    }
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Finance approval error:', error);
    return NextResponse.json({ success: false, error: error.message || '审批失败' }, { status: 500 });
  }
}
