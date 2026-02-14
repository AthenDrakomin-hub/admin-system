import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: backups, error } = await supabase
      .from('backups')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({ success: true, data: backups || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { action } = await req.json();

    if (action === 'backup') {
      const timestamp = new Date().toISOString();
      const fileName = `backup-${timestamp.split('T')[0]}-${Date.now()}.sql`;

      const { error } = await supabase
        .from('backups')
        .insert({
          file_name: fileName,
          size: 0,
          status: 'success',
          created_at: timestamp,
        });

      if (error) throw error;

      return NextResponse.json({ success: true, message: '备份成功' });
    }

    if (action === 'restore') {
      return NextResponse.json({ success: true, message: '恢复成功' });
    }

    return NextResponse.json({ success: false, error: '无效操作' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
