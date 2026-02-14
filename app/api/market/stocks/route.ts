import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: stocks, error } = await supabase
      .from('stocks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data: stocks || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { action, stockId, symbol, enabled, refreshRate } = await req.json();

    if (action === 'add') {
      const { error } = await supabase.from('stocks').insert({
        symbol,
        enabled: true,
        refresh_rate: refreshRate || 5,
      });
      if (error) throw error;
    } else if (action === 'update') {
      const { error } = await supabase
        .from('stocks')
        .update({ enabled, refresh_rate: refreshRate })
        .eq('id', stockId);
      if (error) throw error;
    } else if (action === 'delete') {
      const { error } = await supabase.from('stocks').delete().eq('id', stockId);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
