import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logAudit } from '@/lib/audit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('users')
      .select('id, username, real_name, status, auth_status, created_at')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('User status query error:', error);
      return NextResponse.json({ success: true, data: [] });
    }
    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error('User status error:', error);
    return NextResponse.json({ success: true, data: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { userId, action, reason, adminId, adminName } = await req.json();

    if (!userId || !action) {
      return NextResponse.json({ success: false, error: '缺少必要参数' }, { status: 400 });
    }

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json({ success: false, error: '用户不存在' }, { status: 404 });
    }

    let updateData: any = {};

    if (action === 'freeze') {
      updateData.status = 'frozen';
    } else if (action === 'unfreeze') {
      updateData.status = 'active';
    } else if (action === 'auth_approve') {
      updateData.auth_status = 'verified';
    } else if (action === 'auth_reject') {
      updateData.auth_status = 'rejected';
    } else if (action === 'cancel_request') {
      updateData.status = 'cancelled';
    }

    const { error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (error) throw error;

    if (adminId && adminName) {
      await logAudit(
        `用户${action === 'freeze' ? '冻结' : action === 'unfreeze' ? '解冻' : action === 'auth_approve' ? '实名认证通过' : '实名认证驳回'}`,
        'user_freeze',
        adminId,
        adminName,
        'user',
        userId,
        user,
        updateData,
        reason
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
