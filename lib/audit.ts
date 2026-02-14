import { supabase } from './supabase';

export interface AuditLog {
  id: string;
  action: string;
  action_type: 'fund_adjust' | 'order_modify' | 'withdraw_approve' | 'user_freeze' | 'config_change';
  operator_id: string;
  operator_name: string;
  target_type: 'user' | 'order' | 'withdraw' | 'config';
  target_id: string;
  before_data?: any;
  after_data?: any;
  reason?: string;
  ip_address?: string;
  created_at: string;
}

export async function logAudit(
  action: string,
  actionType: AuditLog['action_type'],
  operatorId: string,
  operatorName: string,
  targetType: AuditLog['target_type'],
  targetId: string,
  beforeData?: any,
  afterData?: any,
  reason?: string
) {
  if (!supabase) return;
  
  // Vercel优化：限制数据大小
  const sanitizeData = (data: any) => {
    if (!data) return null;
    const str = JSON.stringify(data);
    return str.length > 1000 ? { _truncated: true, _size: str.length } : data;
  };
  
  const log: Omit<AuditLog, 'id'> = {
    action: action.substring(0, 200), // 限制长度
    action_type: actionType,
    operator_id: operatorId,
    operator_name: operatorName,
    target_type: targetType,
    target_id: targetId,
    before_data: sanitizeData(beforeData),
    after_data: sanitizeData(afterData),
    reason: reason?.substring(0, 500), // 限制长度
    created_at: new Date().toISOString(),
  };
  
  await supabase.from('audit_logs').insert(log);
}
