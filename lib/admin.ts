import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from './supabase';

// 校验当前用户是否是管理员
export async function isAdmin() {
  const supabase = createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  return data?.role === 'admin';
}

// API 管理员权限校验
export async function requireAdmin(): Promise<NextResponse | { user: any; role: string }> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (data?.role !== 'admin') {
    return NextResponse.json({ error: '无管理员权限' }, { status: 403 });
  }

  return { user, role: data.role };
}
