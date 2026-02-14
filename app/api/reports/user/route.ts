import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: users, error } = await supabase
      .from('users')
      .select('id, created_at, status')
      .order('created_at', { ascending: true });

    if (error) throw error;

    const grouped: any = {};
    users?.forEach((user: any) => {
      const date = new Date(user.created_at).toLocaleDateString();
      if (!grouped[date]) {
        grouped[date] = { date, newUsers: 0, activeUsers: 0, totalUsers: 0 };
      }
      grouped[date].newUsers++;
      if (user.status === 'active') grouped[date].activeUsers++;
    });

    const data = Object.values(grouped).map((item: any) => ({
      ...item,
      totalUsers: users?.length || 0,
      retentionRate: ((item.activeUsers / item.newUsers) * 100).toFixed(2),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
