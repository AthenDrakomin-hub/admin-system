/**
 * Unified API response format for the entire application
 * For APIs that return data in a 'data' field
 */
export interface ApiResponse<T = any> {
  /** Whether the request was successful */
  success: boolean;
  /** Response data, present when success is true */
  data?: T;
  /** Error message, present when success is false */
  error?: string;
  /** Pagination information, present for paginated responses */
  pagination?: Pagination;
  /** ISO timestamp of the response */
  timestamp?: string;
}

/**
 * API response for authentication endpoints
 * Some APIs like login return token and user directly, not in data field
 */
export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: {
    username: string;
    role: string;
  };
  error?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/**
 * Common status enumerations
 */
export enum OrderStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  COMPLETED = 'completed',
}

export enum FinanceStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum Currency {
  CNY = 'CNY',
  HKD = 'HKD',
  USD = 'USD',
}

export enum TradeType {
  A_SHARE = 'a-share',
  HK_SHARE = 'hk-share',
  IPO = 'ipo',
  BLOCK = 'block',
  BOARD = 'board',
}

export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell',
}

export enum AuditAction {
  APPROVE = 'approve',
  REJECT = 'reject',
}

/**
 * Common request/response types for core APIs
 */

// Trade audit request
export interface TradeAuditRequest {
  orderId: string;
  status: OrderStatus.APPROVED | OrderStatus.REJECTED;
  remark?: string;
  adminId: string;
  adminName: string;
}

// Trade audit response
export interface TradeAuditResponse {
  orderId: string;
  status: OrderStatus;
}

// Fund adjustment request
export interface FundAdjustRequest {
  userId: string;
  amount: number;
  type: 'add' | 'reduce';
  currency: Currency;
  remark?: string;
  adminId: string;
  adminName: string;
}

// Fund adjustment response
export interface FundAdjustResponse {
  balance: number;
  currency: Currency;
}

// Withdraw audit request
export interface WithdrawAuditRequest {
  applyId: string;
  status: FinanceStatus.APPROVED | FinanceStatus.REJECTED;
  remark?: string;
  adminId: string;
  adminName: string;
}

// Withdraw audit response
export interface WithdrawAuditResponse {
  applyId: string;
  status: FinanceStatus;
}
