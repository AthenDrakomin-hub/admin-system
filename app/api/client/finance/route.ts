'use server';

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

// 初始化Supabase客户端
const getSupabase = () => {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );
};

// 验证JWT令牌
const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch (err) {
    return null;
  }
};

// POST - 充值/提现申请
export async function POST(request: Request) {
  try {
    // 1. 验证令牌
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '未授权' },
        { status: 401 }
      );
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: '令牌无效或过期' },
        { status: 401 }
      );
    }

    // 2. 解析请求体
    const body = await request.json();
    const { userId, type, amount, currency = 'CNY', paymentMethod, bankInfo } = body;

    // 3. 基础参数校验
    if (!userId || !type || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数或金额无效' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const requestId = uuidv4();

    // 4. 处理充值请求
    if (type === 'recharge') {
      // 创建充值申请
      const { error } = await supabase
        .from('recharge_requests')
        .insert({
          user_id: userId,
          amount,
          currency,
          payment_method: paymentMethod,
          status: 'pending',
          request_id: requestId
        });

      if (error) {
        console.error('创建充值申请失败:', error);
        return NextResponse.json(
          { success: false, error: '充值申请提交失败' },
          { status: 500 }
        );
      }

      // 更新用户余额
      await supabase
        .from('users')
        .update({
          balance_cny: supabase.raw(`balance_cny + ${amount}`),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      // 记录流水
      await supabase
        .from('finance_flows')
        .insert({
          user_id: userId,
          type: 'deposit',
          amount,
          currency,
          balance_after: amount, // 简化处理，实际应查询当前余额
          description: `充值-${paymentMethod || '未知方式'}`,
          settled: true
        });

      return NextResponse.json({
        success: true,
        data: {
          requestId,
          status: 'pending'
        }
      });
    }

    // 5. 处理提现请求
    if (type === 'withdraw') {
      // 校验提现参数
      if (!bankInfo || !bankInfo.bankName || !bankInfo.bankAccount || !bankInfo.accountHolder) {
        return NextResponse.json(
          { success: false, error: '提现缺少银行信息' },
          { status: 400 }
        );
      }

      // 检查余额
      const { data: user } = await supabase
        .from('users')
        .select('balance_cny, balance_hkd')
        .eq('id', userId)
        .single();

      const balance = currency === 'CNY' ? user.balance_cny : user.balance_hkd;
      if (balance < amount) {
        return NextResponse.json(
          { success: false, error: '余额不足' },
          { status: 400 }
        );
      }

      // 创建提现申请
      const { error } = await supabase
        .from('withdraw_requests')
        .insert({
          user_id: userId,
          amount,
          currency,
          bank_name: bankInfo.bankName,
          bank_account: bankInfo.bankAccount,
          account_holder: bankInfo.accountHolder,
          status: 'pending',
          unsettled_amount: amount,
          request_id: requestId
        });

      if (error) {
        console.error('创建提现申请失败:', error);
        return NextResponse.json(
          { success: false, error: '提现申请提交失败' },
          { status: 500 }
        );
      }

      // 更新用户余额
      const balanceField = currency === 'CNY' ? 'balance_cny' : 'balance_hkd';
      await supabase
        .from('users')
        .update({
          [balanceField]: supabase.raw(`${balanceField} - ${amount}`),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      // 记录流水
      await supabase
        .from('finance_flows')
        .insert({
          user_id: userId,
          type: 'withdraw',
          amount: -amount, // 提现为负数
          currency,
          balance_after: balance - amount,
          description: `提现-${bankInfo.bankName}`,
          settled: false
        });

      return NextResponse.json({
        success: true,
        data: {
          requestId,
          status: 'pending',
          unsettledAmount: (balance - amount).toString()
        }
      });
    }

    // 未知操作类型
    return NextResponse.json(
      { success: false, error: '无效的操作类型' },
      { status: 400 }
    );

  } catch (err) {
    console.error('财务接口POST失败:', err);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}

// GET - 获取交易流水
export async function GET(request: Request) {
  try {
    // 1. 验证令牌
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '未授权' },
        { status: 401 }
      );
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: '令牌无效或过期' },
        { status: 401 }
      );
    }

    // 2. 获取查询参数
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '缺少用户ID' },
        { status: 400 }
      );
    }

    // 3. 查询流水
    const supabase = getSupabase();
    const { data: flows, error } = await supabase
      .from('finance_flows')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('查询流水失败:', error);
      return NextResponse.json(
        { success: false, error: '查询流水失败' },
        { status: 500 }
      );
    }

    // 格式化返回数据
    const formattedFlows = flows.map(flow => ({
      id: flow.id,
      type: flow.type,
      amount: flow.amount,
      currency: flow.currency,
      balance_after: flow.balance_after,
      description: flow.description,
      created_at: flow.created_at,
      settled: flow.settled
    }));

    return NextResponse.json({
      success: true,
      data: { flows: formattedFlows }
    });

  } catch (err) {
    console.error('财务接口GET失败:', err);
    return NextResponse.json(
      { success: false, error: '服务器内部错误' },
      { status: 500 }
    );
  }
}