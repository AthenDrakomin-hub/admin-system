export interface ClientOrderRequest {
  symbol: string;
  type: 'buy' | 'sell';
  price: number;
  quantity: number;
}

export interface ClientResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
