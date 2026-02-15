/**
 * 管理端API客户端
 * 提供统一的认证和API调用方法
 */

/**
 * 获取管理员认证头
 */
export function getAdminAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  if (!token) {
    throw new Error('管理员未登录，请重新登录');
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

/**
 * 获取管理员信息
 */
export function getAdminInfo() {
  if (typeof window === 'undefined') return null;
  
  return {
    adminId: localStorage.getItem('adminId') || localStorage.getItem('adminName'),
    adminName: localStorage.getItem('adminName'),
    adminRole: localStorage.getItem('adminRole')
  };
}

/**
 * 检查管理员是否已登录
 */
export function isAdminLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('token');
}

/**
 * 管理端API调用封装
 */
export async function adminApiFetch(
  url: string, 
  options: RequestInit = {}
): Promise<any> {
  const headers = getAdminAuthHeaders();
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'API请求失败');
  }
  
  return data;
}

/**
 * 常用API调用方法
 */
export const adminApi = {
  // 用户管理
  users: {
    list: (params?: any) => 
      adminApiFetch(`/api/admin/users?${new URLSearchParams(params)}`),
    get: (userId: string) => 
      adminApiFetch(`/api/admin/users?userId=${userId}`),
    create: (data: any) =>
      adminApiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ action: 'create', data })
      }),
    freeze: (userId: string, reason: string) =>
      adminApiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          action: 'freeze',
          userId,
          data: { reason }
        })
      }),
    unfreeze: (userId: string, reason: string) =>
      adminApiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          action: 'unfreeze',
          userId,
          data: { reason }
        })
      }),
    resetPassword: (userId: string) =>
      adminApiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          action: 'reset_password',
          userId
        })
      }),
    adjustBalance: (userId: string, amount: number, currency: string, reason: string) =>
      adminApiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          action: 'adjust_balance',
          userId,
          data: { amount, currency, reason }
        })
      })
  },

  // 邀请码管理
  invites: {
    list: (params?: any) =>
      adminApiFetch(`/api/admin/invites?${new URLSearchParams(params)}`),
    generate: (count: number, organizationId: string, expiresDays?: number) =>
      adminApiFetch('/api/admin/invites', {
        method: 'POST',
        body: JSON.stringify({
          count,
          organization_id: organizationId,
          expires_days: expiresDays
        })
      }),
    disable: (inviteId: string, reason: string) =>
      adminApiFetch('/api/admin/invites', {
        method: 'POST',
        body: JSON.stringify({
          action: 'disable',
          inviteId,
          data: { reason }
        })
      }),
    enable: (inviteId: string) =>
      adminApiFetch('/api/admin/invites', {
        method: 'POST',
        body: JSON.stringify({
          action: 'enable',
          inviteId
        })
      })
  },

  // 审核管理
  audits: {
    list: (type: string, params?: any) =>
      adminApiFetch(`/api/admin/audits?type=${type}&${new URLSearchParams(params)}`),
    approve: (targetType: string, targetId: string) =>
      adminApiFetch('/api/admin/audits', {
        method: 'POST',
        body: JSON.stringify({
          action: 'approve',
          targetType,
          targetId
        })
      }),
    reject: (targetType: string, targetId: string, reason: string) =>
      adminApiFetch('/api/admin/audits', {
        method: 'POST',
        body: JSON.stringify({
          action: 'reject',
          targetType,
          targetId,
          data: { reason }
        })
      })
  },

  // 消息管理
  messages: {
    list: (params?: any) =>
      adminApiFetch(`/api/admin/messages?${new URLSearchParams(params)}`),
    send: (userId: string, title: string, content: string, type?: string) =>
      adminApiFetch('/api/admin/messages', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          title,
          content,
          type: type || 'notification'
        })
      }),
    broadcast: (title: string, content: string, type?: string) =>
      adminApiFetch('/api/admin/messages', {
        method: 'POST',
        body: JSON.stringify({
          broadcast: true,
          title,
          content,
          type: type || 'broadcast'
        })
      }),
    markRead: (messageId: string) =>
      adminApiFetch('/api/admin/messages', {
        method: 'POST',
        body: JSON.stringify({
          action: 'mark_read',
          messageId
        })
      }),
    delete: (messageId: string) =>
      adminApiFetch('/api/admin/messages', {
        method: 'POST',
        body: JSON.stringify({
          action: 'delete',
          messageId
        })
      })
  },

  // 实时监控
  monitor: {
    realtime: (metrics?: string) =>
      adminApiFetch(`/api/admin/monitor/realtime?metrics=${metrics || 'all'}`)
  },

  // 批量操作
  batch: {
    users: (action: string, filters?: any, data?: any) =>
      adminApiFetch('/api/admin/batch', {
        method: 'POST',
        body: JSON.stringify({
          resource: 'users',
          action,
          filters,
          data
        })
      }),
    orders: (action: string, filters?: any, data?: any) =>
      adminApiFetch('/api/admin/batch', {
        method: 'POST',
        body: JSON.stringify({
          resource: 'orders',
          action,
          filters,
          data
        })
      })
  },

  // 数据导出
  export: {
    users: (dateRange?: string, format?: string) =>
      adminApiFetch(`/api/admin/export?resource=users&format=${format || 'json'}&date_range=${dateRange || '30d'}`),
    orders: (type?: string, dateRange?: string, format?: string) =>
      adminApiFetch(`/api/admin/export?resource=orders&type=${type || 'all'}&format=${format || 'json'}&date_range=${dateRange || '30d'}`),
    finance: (month?: string, format?: string) =>
      adminApiFetch(`/api/admin/export?resource=finance&month=${month || new Date().toISOString().slice(0, 7)}&format=${format || 'json'}`)
  },

  // 风控管理
  risk: {
    rules: {
      list: (params?: any) =>
        adminApiFetch(`/api/admin/risk?type=rules&${new URLSearchParams(params)}`),
      create: (data: any) =>
        adminApiFetch('/api/admin/risk', {
          method: 'POST',
          body: JSON.stringify({ data })
        }),
      update: (id: string, data: any) =>
        adminApiFetch('/api/admin/risk', {
          method: 'PUT',
          body: JSON.stringify({ id, data })
        }),
      delete: (id: string) =>
        adminApiFetch(`/api/admin/risk?id=${id}`, {
          method: 'DELETE'
        })
    },
    alerts: {
      list: (params?: any) =>
        adminApiFetch(`/api/admin/risk?type=alerts&${new URLSearchParams(params)}`)
    }
  },

  // 系统配置
  config: {
    get: (type?: string) =>
      adminApiFetch(`/api/admin/config?type=${type || 'all'}`),
    update: (configType: string, data: any) =>
      adminApiFetch('/api/admin/config', {
        method: 'POST',
        body: JSON.stringify({ configType, data })
      })
  },

  // 高级分析
  analytics: {
    overview: (period?: string) =>
      adminApiFetch(`/api/admin/analytics?type=overview&period=${period || '30d'}`),
    users: (period?: string, granularity?: string) =>
      adminApiFetch(`/api/admin/analytics?type=users&period=${period || '30d'}&granularity=${granularity || 'daily'}`),
    trades: (period?: string, granularity?: string) =>
      adminApiFetch(`/api/admin/analytics?type=trades&period=${period || '30d'}&granularity=${granularity || 'daily'}`),
    finance: (period?: string, granularity?: string) =>
      adminApiFetch(`/api/admin/analytics?type=finance&period=${period || '30d'}&granularity=${granularity || 'daily'}`),
    performance: (period?: string) =>
      adminApiFetch(`/api/admin/analytics?type=performance&period=${period || '30d'}`)
  }
};

export default adminApi;