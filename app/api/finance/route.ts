'use server';

import { NextResponse } from 'next/server';
import { 
  getRechargeRequests, 
  getWithdrawRequests, 
  approveRechargeRequest, 
  approveWithdrawRequest 
} from '@/lib/finance';

// GET - 管理端获取申请列表（充值/提现）
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // recharge/withdraw
    const status = searchParams.get('status'); // pending/approved/rejected
    
    let data;
    if (type === 'recharge') {
      data = await getRechargeRequests(status || undefined);
    } else if (type === 'withdraw') {
      data = await getWithdrawRequests(status || undefined);
    } else {
      return NextResponse.json(
        { success: false, error: '缺少type参数（recharge/withdraw）' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: { requests: data }
    });
  } catch (err: any) {
    console.error('管理端获取申请列表失败:', err);
    return NextResponse.json(
      { success: false, error: err.message || '服务器内部错误' },
      { status: 500 }
    );
  }
}

// POST - 管理端审批申请
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, requestId, approve } = body;
    
    // 校验参数
    if (!type || !requestId || approve === undefined) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数（type/requestId/approve）' },
        { status: 400 }
      );
    }
    
    let result;
    if (type === 'recharge') {
      result = await approveRechargeRequest(requestId, approve);
    } else if (type === 'withdraw') {
      result = await approveWithdrawRequest(requestId, approve);
    } else {
      return NextResponse.json(
        { success: false, error: '无效的type参数（recharge/withdraw）' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    console.error('管理端审批申请失败:', err);
    return NextResponse.json(
      { success: false, error: err.message || '服务器内部错误' },
      { status: 500 }
    );
  }
}