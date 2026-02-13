import { supabase } from './supabase';

export async function logAudit(action: string, userId: string, details: any) {
  await supabase.from('audit_logs').insert({
    action,
    user_id: userId,
    details,
    created_at: new Date().toISOString(),
  });
}
