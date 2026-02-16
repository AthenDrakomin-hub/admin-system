export type AdminRole = 'super_admin' | 'admin' | 'auditor' | 'finance_manager';

export interface AdminUser {
  id: string;
  username: string;
  role: AdminRole;
  created_at: string;
  last_login?: string;
  permissions?: AdminPermissions;
}

export interface AdminPermissions {
  // 基础权限
  canManageAdmins: boolean;
  canManageUsers: boolean;
  canApproveFinance: boolean;
  canConfigureSystem: boolean;
  canViewAuditLogs: boolean;
  
  // 交易审核权限（细粒度）
  canApproveTrades: boolean;           // 通用交易审核权限
  canApproveAShare: boolean;           // A股交易审核
  canApproveHKShare: boolean;          // 港股交易审核
  canApproveBlockTrade: boolean;       // 大宗交易审核
  canApproveIPO: boolean;              // IPO申购审核
  canApproveBoard: boolean;            // 一键打板审核
  canApproveConditional: boolean;      // 条件单审核
  
  // 管理权限
  canManageMarket: boolean;            // 行情管理
  canViewReports: boolean;             // 报表查看
  canExportData: boolean;              // 数据导出
  canManageRiskRules: boolean;         // 风控规则管理
}

export const getPermissions = (role: AdminRole): AdminPermissions => {
  switch (role) {
    case 'super_admin':
      return {
        canManageAdmins: true,
        canManageUsers: true,
        canApproveFinance: true,
        canConfigureSystem: true,
        canViewAuditLogs: true,
        canApproveTrades: true,
        canApproveAShare: true,
        canApproveHKShare: true,
        canApproveBlockTrade: true,
        canApproveIPO: true,
        canApproveBoard: true,
        canApproveConditional: true,
        canManageMarket: true,
        canViewReports: true,
        canExportData: true,
        canManageRiskRules: true,
      };
    
    case 'admin':
      return {
        canManageAdmins: false,
        canManageUsers: true,
        canApproveFinance: true,
        canConfigureSystem: true,
        canViewAuditLogs: true,
        canApproveTrades: true,
        canApproveAShare: true,
        canApproveHKShare: true,
        canApproveBlockTrade: true,
        canApproveIPO: true,
        canApproveBoard: true,
        canApproveConditional: true,
        canManageMarket: true,
        canViewReports: true,
        canExportData: true,
        canManageRiskRules: true,
      };
    
    case 'auditor':
      return {
        canManageAdmins: false,
        canManageUsers: false,
        canApproveFinance: false,
        canConfigureSystem: false,
        canViewAuditLogs: true,
        canApproveTrades: true,
        canApproveAShare: true,
        canApproveHKShare: true,
        canApproveBlockTrade: true,
        canApproveIPO: true,
        canApproveBoard: true,
        canApproveConditional: true,
        canManageMarket: false,
        canViewReports: true,
        canExportData: false,
        canManageRiskRules: false,
      };
    
    case 'finance_manager':
      return {
        canManageAdmins: false,
        canManageUsers: false,
        canApproveFinance: true,
        canConfigureSystem: false,
        canViewAuditLogs: true,
        canApproveTrades: false,
        canApproveAShare: false,
        canApproveHKShare: false,
        canApproveBlockTrade: false,
        canApproveIPO: false,
        canApproveBoard: false,
        canApproveConditional: false,
        canManageMarket: false,
        canViewReports: true,
        canExportData: true,
        canManageRiskRules: false,
      };
    
    default:
      return {
        canManageAdmins: false,
        canManageUsers: false,
        canApproveFinance: false,
        canConfigureSystem: false,
        canViewAuditLogs: false,
        canApproveTrades: false,
        canApproveAShare: false,
        canApproveHKShare: false,
        canApproveBlockTrade: false,
        canApproveIPO: false,
        canApproveBoard: false,
        canApproveConditional: false,
        canManageMarket: false,
        canViewReports: false,
        canExportData: false,
        canManageRiskRules: false,
      };
  }
};

// 检查特定交易类型的审核权限
export const checkTradePermission = (permissions: AdminPermissions, tradeType: string): boolean => {
  switch (tradeType) {
    case 'a_share':
      return permissions.canApproveAShare;
    case 'hk_share':
      return permissions.canApproveHKShare;
    case 'block':
      return permissions.canApproveBlockTrade;
    case 'ipo':
      return permissions.canApproveIPO;
    case 'board':
      return permissions.canApproveBoard;
    case 'conditional':
      return permissions.canApproveConditional;
    case 'abnormal':
      // 异常订单使用通用交易审核权限
      return permissions.canApproveTrades;
    default:
      return permissions.canApproveTrades;
  }
};

// 获取管理员显示名称
export const getAdminDisplayName = (admin: AdminUser): string => {
  return admin.username;
};

// 验证管理员操作权限
export const validateAdminAction = (
  permissions: AdminPermissions,
  action: string,
  resource: string
): { allowed: boolean; reason?: string } => {
  // 交易管理权限验证
  if (resource === 'trade_management') {
    if (action === 'view' && !permissions.canApproveTrades) {
      return { allowed: false, reason: '无交易管理查看权限' };
    }
    if (action === 'approve' && !permissions.canApproveTrades) {
      return { allowed: false, reason: '无交易审核权限' };
    }
  }
  
  // 用户管理权限验证
  if (resource === 'user_management') {
    if (!permissions.canManageUsers) {
      return { allowed: false, reason: '无用户管理权限' };
    }
  }
  
  // 财务管理权限验证
  if (resource === 'finance_management') {
    if (action === 'approve' && !permissions.canApproveFinance) {
      return { allowed: false, reason: '无财务审核权限' };
    }
    if (action === 'view' && !permissions.canApproveFinance) {
      return { allowed: false, reason: '无财务查看权限' };
    }
  }
  
  // 行情管理权限验证
  if (resource === 'market_management') {
    if (!permissions.canManageMarket) {
      return { allowed: false, reason: '无行情管理权限' };
    }
  }
  
  // 系统管理权限验证
  if (resource === 'system_management') {
    if (!permissions.canConfigureSystem) {
      return { allowed: false, reason: '无系统配置权限' };
    }
  }
  
  // 报表查看权限验证
  if (resource === 'report_view') {
    if (!permissions.canViewReports) {
      return { allowed: false, reason: '无报表查看权限' };
    }
  }
  
  // 风控管理权限验证
  if (resource === 'risk_management') {
    if (!permissions.canManageRiskRules) {
      return { allowed: false, reason: '无风控规则管理权限' };
    }
  }
  
  // 管理员管理权限验证
  if (resource === 'admin_management') {
    if (!permissions.canManageAdmins) {
      return { allowed: false, reason: '无管理员管理权限' };
    }
  }
  
  // 审计日志查看权限验证
  if (resource === 'audit_log_view') {
    if (!permissions.canViewAuditLogs) {
      return { allowed: false, reason: '无审计日志查看权限' };
    }
  }
  
  // 数据导出权限验证
  if (resource === 'data_export') {
    if (!permissions.canExportData) {
      return { allowed: false, reason: '无数据导出权限' };
    }
  }
  
  // 特定交易类型审核权限验证（旧版兼容）
  if (action === 'approve' && resource.startsWith('trade_')) {
    const tradeType = resource.replace('trade_', '');
    const allowed = checkTradePermission(permissions, tradeType);
    
    if (!allowed) {
      return { allowed: false, reason: `无${tradeType}交易审核权限` };
    }
  }
  
  return { allowed: true };
};

// 管理端新建用户请求类型
export interface CreateUserRequest {
  username: string;
  password: string;
  real_name: string;
  phone: string;
  email?: string;
  status?: 'active' | 'pending' | 'disabled';
}

// 新建用户响应类型
export interface CreateUserResponse {
  success: boolean;
  data?: {
    id: string;
    username: string;
  };
  error?: string;
}
