export interface SystemParam {
  key: string;
  value: string;
  description: string;
}

export interface Admin {
  id: string;
  username: string;
  role: 'admin' | 'super_admin';
  created_at: string;
}

export interface AuditLog {
  id: string;
  action: string;
  user_id: string;
  details: any;
  created_at: string;
}
