import { AShareOrder, BlockOrder, BoardOrder } from '@/types/trade';

// 可撮合的订单类型（有price属性）
type MatchableOrder = AShareOrder | BlockOrder | BoardOrder;

// 撮合规则：价格优先、时间优先
export interface MatchResult {
  matched: boolean;
  buyOrder?: MatchableOrder;
  sellOrder?: MatchableOrder;
  matchPrice: number;
  matchQuantity: number;
  reason?: string;
}

// 获取订单价格
function getOrderPrice(order: MatchableOrder): number {
  if ('price' in order) return order.price;
  if ('limit_up_price' in order) return order.limit_up_price;
  return 0;
}

// 半自动撮合：系统匹配，管理员确认
export const autoMatch = (buyOrders: MatchableOrder[], sellOrders: MatchableOrder[]): MatchResult[] => {
  const matches: MatchResult[] = [];
  
  // 买单按价格降序、时间升序排序
  const sortedBuys = [...buyOrders].sort((a, b) => {
    const priceA = getOrderPrice(a);
    const priceB = getOrderPrice(b);
    if (priceB !== priceA) return priceB - priceA;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
  
  // 卖单按价格升序、时间升序排序
  const sortedSells = [...sellOrders].sort((a, b) => {
    const priceA = getOrderPrice(a);
    const priceB = getOrderPrice(b);
    if (priceA !== priceB) return priceA - priceB;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
  
  for (const buy of sortedBuys) {
    for (const sell of sortedSells) {
      const buyPrice = getOrderPrice(buy);
      const sellPrice = getOrderPrice(sell);
      
      // 价格匹配：买价 >= 卖价
      if (buyPrice >= sellPrice && buy.symbol === sell.symbol) {
        const matchQuantity = Math.min(buy.quantity, sell.quantity);
        const matchPrice = (buyPrice + sellPrice) / 2; // 中间价成交
        
        matches.push({
          matched: true,
          buyOrder: buy,
          sellOrder: sell,
          matchPrice,
          matchQuantity,
        });
      }
    }
  }
  
  return matches;
};

// 检查订单是否可以成交
export const canExecute = (order: MatchableOrder, userBalance: number): { can: boolean; reason?: string } => {
  if (order.side === 'buy') {
    const price = getOrderPrice(order);
    const requiredAmount = price * order.quantity;
    if (userBalance < requiredAmount) {
      return { can: false, reason: '账户余额不足' };
    }
  }
  
  if (order.status !== 'pending' && order.status !== 'approved') {
    return { can: false, reason: '订单状态不允许成交' };
  }
  
  return { can: true };
};

// 强制成交订单
export const forceExecute = (order: MatchableOrder, adminId: string) => {
  return {
    ...order,
    status: 'completed' as const,
    approved_by: adminId,
    approved_at: new Date().toISOString(),
  };
};
