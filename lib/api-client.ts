/**
 * Unified API client for frontend
 * Provides consistent request handling, error handling, and enum mapping
 */

import { ApiResponse, OrderStatus, FinanceStatus, AuditAction, Currency } from '@/types/api';

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
}

/**
 * Main request function
 */
export async function request<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    params,
    timeout = 10000,
    headers = {},
    ...fetchOptions
  } = options;

  // Build URL with query parameters
  let url = endpoint;
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Set default headers
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add authorization header if token exists
  const token = localStorage.getItem('adminToken');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: { ...defaultHeaders, ...headers },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data: ApiResponse<T> = await response.json();

    // Handle HTTP errors
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Handle business logic errors
    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Unknown error',
      };
    }

    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: '请求超时，请检查网络连接',
      };
    }

    return {
      success: false,
      error: error.message || '网络请求失败',
    };
  }
}

/**
 * Enum mapping utilities
 */

// Map Chinese status to backend enum
export const mapOrderStatus = (chineseStatus: string): OrderStatus => {
  const mapping: Record<string, OrderStatus> = {
    '待审核': OrderStatus.PENDING,
    '已通过': OrderStatus.APPROVED,
    '已驳回': OrderStatus.REJECTED,
    '已完成': OrderStatus.COMPLETED,
    'pending': OrderStatus.PENDING,
    'approved': OrderStatus.APPROVED,
    'rejected': OrderStatus.REJECTED,
    'completed': OrderStatus.COMPLETED,
  };
  return mapping[chineseStatus] || OrderStatus.PENDING;
};

export const mapFinanceStatus = (chineseStatus: string): FinanceStatus => {
  const mapping: Record<string, FinanceStatus> = {
    '待审核': FinanceStatus.PENDING,
    '已通过': FinanceStatus.APPROVED,
    '已驳回': FinanceStatus.REJECTED,
    'pending': FinanceStatus.PENDING,
    'approved': FinanceStatus.APPROVED,
    'rejected': FinanceStatus.REJECTED,
  };
  return mapping[chineseStatus] || FinanceStatus.PENDING;
};

export const mapAuditAction = (chineseAction: string): AuditAction => {
  const mapping: Record<string, AuditAction> = {
    '批准': AuditAction.APPROVE,
    '驳回': AuditAction.REJECT,
    'approve': AuditAction.APPROVE,
    'reject': AuditAction.REJECT,
  };
  return mapping[chineseAction] || AuditAction.APPROVE;
};

export const mapCurrency = (chineseCurrency: string): Currency => {
  const mapping: Record<string, Currency> = {
    '人民币': Currency.CNY,
    '港币': Currency.HKD,
    '美元': Currency.USD,
    'CNY': Currency.CNY,
    'HKD': Currency.HKD,
    'USD': Currency.USD,
  };
  return mapping[chineseCurrency] || Currency.CNY;
};

/**
 * Specific API methods for common operations
 */

// Trade APIs
export const tradeApi = {
  // Get pending orders
  getPendingOrders: (tradeType?: string, page = 1, limit = 20) => 
    request('/api/trade', {
      params: { trade_type: tradeType, page, limit },
    }),

  // Audit order
  auditOrder: (orderId: string, action: AuditAction, adminId: string, adminName: string, reason?: string) =>
    request('/api/trade', {
      method: 'POST',
      body: JSON.stringify({ orderId, action, adminId, adminName, reason }),
    }),
};

// Finance APIs
export const financeApi = {
  // Get pending recharges
  getPendingRecharges: (page = 1, limit = 20) =>
    request('/api/finance', {
      params: { type: 'recharge', page, limit },
    }),

  // Get pending withdraws
  getPendingWithdraws: (page = 1, limit = 20) =>
    request('/api/finance', {
      params: { type: 'withdraw', page, limit },
    }),

  // Audit recharge
  auditRecharge: (requestId: string, action: AuditAction, adminId: string, adminName: string, reason?: string) =>
    request('/api/finance', {
      method: 'POST',
      body: JSON.stringify({ 
        type: 'recharge', 
        requestId, 
        action, 
        adminId, 
        adminName, 
        reason 
      }),
    }),

  // Audit withdraw
  auditWithdraw: (requestId: string, action: AuditAction, adminId: string, adminName: string, reason?: string) =>
    request('/api/finance', {
      method: 'POST',
      body: JSON.stringify({ 
        type: 'withdraw', 
        requestId, 
        action, 
        adminId, 
        adminName, 
        reason 
      }),
    }),
};

// User APIs
export const userApi = {
  // Adjust user fund (to be implemented)
  adjustFund: (
    userId: string, 
    amount: number, 
    type: 'add' | 'reduce', 
    currency: Currency,
    adminId: string,
    adminName: string,
    remark?: string
  ) =>
    request('/api/user/fund/adjust', {
      method: 'POST',
      body: JSON.stringify({ 
        userId, 
        amount, 
        type, 
        currency, 
        adminId, 
        adminName, 
        remark 
      }),
    }),
};
