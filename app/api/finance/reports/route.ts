import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { searchParams } = req.nextUrl;
    const type = searchParams.get('type') || 'month';

    const now = new Date();
    let startDate = new Date();
    let groupBy = 'month';

    if (type === 'day') {
      startDate.setDate(now.getDate() - 30);
      groupBy = 'day';
    } else if (type === 'month') {
      startDate.setMonth(now.getMonth() - 12);
      groupBy = 'month';
    } else if (type === 'quarter') {
      startDate.setMonth(now.getMonth() - 36);
      groupBy = 'quarter';
    }

    const { data: flows, error: flowsError } = await supabase
      .from('transaction_flows')
      .select('*')
      .gte('created_at', startDate.toISOString());

    if (flowsError) {
      console.error('Reports flows query error:', flowsError);
      return NextResponse.json({ success: true, data: [] });
    }

    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('fee, created_at')
      .gte('created_at', startDate.toISOString());

    if (ordersError) {
      console.error('Reports orders query error:', ordersError);
    }

    const grouped: any = {};
    flows?.forEach((flow: any) => {
      let period = '';
      const date = new Date(flow.created_at);

      if (groupBy === 'day') {
        period = date.toLocaleDateString();
      } else if (groupBy === 'month') {
        period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (groupBy === 'quarter') {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        period = `${date.getFullYear()}-Q${quarter}`;
      }

      if (!grouped[period]) {
        grouped[period] = {
          period,
          totalRecharge: 0,
          totalWithdraw: 0,
          totalFee: 0,
          netFlow: 0,
          abnormalTransactions: 0,
        };
      }

      if (flow.type === 'deposit') {
        grouped[period].totalRecharge += flow.amount;
      } else if (flow.type === 'withdraw') {
        grouped[period].totalWithdraw += Math.abs(flow.amount);
      }
    });

    orders?.forEach((order: any) => {
      const date = new Date(order.created_at);
      let period = '';

      if (groupBy === 'day') {
        period = date.toLocaleDateString();
      } else if (groupBy === 'month') {
        period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (groupBy === 'quarter') {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        period = `${date.getFullYear()}-Q${quarter}`;
      }

      if (grouped[period]) {
        grouped[period].totalFee += order.fee || 0;
      }
    });

    const data = Object.values(grouped).map((item: any) => ({
      ...item,
      netFlow: item.totalRecharge - item.totalWithdraw - item.totalFee,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Reports error:', error);
    return NextResponse.json({ success: true, data: [] });
  }
}
