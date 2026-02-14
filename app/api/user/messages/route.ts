import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: messages, count, error } = await supabase
      .from('user_messages')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('User messages query error:', error);
      return NextResponse.json({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });
    }

    return NextResponse.json({
      success: true,
      data: messages || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error('User messages error:', error);
    return NextResponse.json({ success: true, data: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { userIds, title, content, type } = await req.json();

    if (!userIds || !title || !content) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }

    const messages = userIds.map((userId: string) => ({
      user_id: userId,
      title,
      content,
      type: type || 'notification',
      read: false,
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('user_messages')
      .insert(messages);

    if (error) throw error;

    return NextResponse.json({ success: true, message: '消息已发送' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
