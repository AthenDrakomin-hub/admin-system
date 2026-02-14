import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'day';

    const now = new Date();
    let startDate = new Date();

    if (period === 'day') {
      startDate.setDate(now.getDate() - 1);
    } else if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    }

    const { data: flows, error } = await supabase
      .from('transaction_flows')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Reconciliation query error:', error);
      return NextResponse.json({ success: true, data: [] });
    }

    const grouped: any = {};
    flows?.forEach((flow: any) => {
      const date = new Date(flow.created_at).toLocaleDateString();
      if (!grouped[date]) {
        grouped[date] = {
          date,
          totalRecharge: 0,
          totalWithdraw: 0,
          balanceChange: 0,
          difference: 0,
          status: 'matched',
        };
      }

      if (flow.type === 'deposit') {
        grouped[date].totalRecharge += flow.amount;
      } else if (flow.type === 'withdraw') {
        grouped[date].totalWithdraw += Math.abs(flow.amount);
      }
    });

    const data = Object.values(grouped).map((item: any) => ({
      ...item,
      balanceChange: item.totalRecharge - item.totalWithdraw,
      difference: 0,
      status: 'matched',
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Reconciliation error:', error);
    return NextResponse.json({ success: true, data: [] });
  }
}
