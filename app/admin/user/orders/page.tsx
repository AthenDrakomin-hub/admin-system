"use client";

import { useState, useEffect } from "react";
import { FileText, RefreshCw } from "lucide-react";
import { adminApiFetch } from "@/lib/admin-api";

export default function OrderManagePage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await adminApiFetch('/api/admin/trade?status=all');
      if (data.success) setOrders(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">用户订单管控</h1>
        <button onClick={fetchOrders} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>
      <div className="bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold">用户</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">股票</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">方向</th>
              <th className="text-right py-3 px-4 text-sm font-semibold">数量</th>
              <th className="text-center py-3 px-4 text-sm font-semibold">状态</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12">加载中...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12">暂无订单</td></tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4">{order.user_id}</td>
                  <td className="py-3 px-4">{order.symbol}</td>
                  <td className="py-3 px-4">{order.side === 'buy' ? '买入' : '卖出'}</td>
                  <td className="py-3 px-4 text-right">{order.quantity}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-1 rounded text-xs bg-slate-100">{order.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
