export type AdminRole = 'super_admin' | 'admin';

export interface AdminUser {
  id: string;
  username: string;
  role: AdminRole;
  created_at: string;
  last_login?: string;
}

export interface AdminPermissions {
  canManageAdmins: boolean;
  canManageUsers: boolean;
  canApproveTrades: boolean;
  canApproveFinance: boolean;
  canConfigureSystem: boolean;
  canViewAuditLogs: boolean;
}

export const getPermissions = (role: AdminRole): AdminPermissions => {
  if (role === 'super_admin') {
    return {
      canManageAdmins: true,
      canManageUsers: true,
      canApproveTrades: true,
      canApproveFinance: true,
      canConfigureSystem: true,
      canViewAuditLogs: true,
    };
  }
  
  return {
    canManageAdmins: false,
    canManageUsers: true,
    canApproveTrades: true,
    canApproveFinance: true,
    canConfigureSystem: true,
    canViewAuditLogs: true,
  };
};
