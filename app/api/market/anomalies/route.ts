import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: anomalies, error } = await supabase
      .from('market_anomalies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data: anomalies || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { action, anomalyId, symbol, type, reason } = await req.json();

    if (action === 'add') {
      const { error } = await supabase.from('market_anomalies').insert({
        symbol,
        type,
        reason,
        status: 'active',
      });
      if (error) throw error;
    } else if (action === 'resolve') {
      const { error } = await supabase
        .from('market_anomalies')
        .update({ status: 'resolved' })
        .eq('id', anomalyId);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
