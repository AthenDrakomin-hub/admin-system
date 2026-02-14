"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";

interface Order {
  id: string;
  user_id: string;
  symbol: string;
  symbol_name: string;
  side: 'buy' | 'sell';
  quantity: number;
  trade_data: any;
  created_at: string;
  users?: {
    username: string;
    real_name: string;
  };
}

interface TradeAuditProps {
  tradeType: string;
  title: string;
  icon: React.ReactNode;
}

export default function TradeAudit({ tradeType, title, icon }: TradeAuditProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/trade?trade_type=${tradeType}&status=pending`);
      const data = await res.json();
      if (data.success) setOrders(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (orderId: string) => {
    if (!confirm('确定批准？')) return;
    try {
      setProcessingId(orderId);
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          action: 'approve',
          adminId: localStorage.getItem('adminId') || '',
          adminName: localStorage.getItem('adminName') || ''
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('审核通过');
        fetchOrders();
      } else {
        alert(`失败: ${data.error}`);
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (orderId: string) => {
    const reason = prompt('驳回原因：');
    if (!reason) return;
    try {
      setProcessingId(orderId);
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          action: 'reject',
          adminId: localStorage.getItem('adminId') || '',
          adminName: localStorage.getItem('adminName') || '',
          reason
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('已驳回');
        fetchOrders();
      } else {
        alert(`失败: ${data.error}`);
      }
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {icon}
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchOrders} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
            待审核: {orders.length}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow border">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold">用户</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">股票</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">方向</th>
              <th className="text-right py-3 px-4 text-sm font-semibold">价格</th>
              <th className="text-right py-3 px-4 text-sm font-semibold">数量</th>
              <th className="text-right py-3 px-4 text-sm font-semibold">金额</th>
              <th className="text-center py-3 px-4 text-sm font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12">加载中...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12"><Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" /><p>暂无待审核订单</p></td></tr>
            ) : (
              orders.map((order) => {
                const tradeData = typeof order.trade_data === 'string' ? JSON.parse(order.trade_data) : order.trade_data;
                const price = tradeData?.price || 0;
                const amount = tradeData?.amount || (price * order.quantity);
                return (
                  <tr key={order.id} className="border-b hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{order.users?.real_name || '未知'}</div>
                      <div className="text-xs text-slate-500">{order.users?.username}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{order.symbol}</div>
                      <div className="text-xs text-slate-500">{order.symbol_name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${order.side === 'buy' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {order.side === 'buy' ? '买入' : '卖出'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">{price.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">{order.quantity}</td>
                    <td className="py-3 px-4 text-right font-bold">{amount.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => handleApprove(order.id)} disabled={processingId === order.id} className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg">
                          <CheckCircle className="w-4 h-4 inline mr-1" />批准
                        </button>
                        <button onClick={() => handleReject(order.id)} disabled={processingId === order.id} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg">
                          <XCircle className="w-4 h-4 inline mr-1" />驳回
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
