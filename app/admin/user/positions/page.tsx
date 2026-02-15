"use client";

import { useState, useEffect } from "react";
import { Package, RefreshCw } from "lucide-react";
import { getAdminAuthHeaders } from "@/lib/admin-api";

export default function PositionManagePage() {
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPositions = async () => {
    try {
      setLoading(true);
      const headers = getAdminAuthHeaders();
      const res = await fetch('/api/admin/users?action=positions', { headers });
      const data = await res.json();
      if (data.success || data.data) setPositions(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">持仓管理</h1>
        <button onClick={fetchPositions} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg">
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
              <th className="text-right py-3 px-4 text-sm font-semibold">持仓</th>
              <th className="text-right py-3 px-4 text-sm font-semibold">成本价</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-12">加载中...</td></tr>
            ) : positions.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12">暂无持仓</td></tr>
            ) : (
              positions.map((pos, i) => (
                <tr key={i} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4">{pos.user_id}</td>
                  <td className="py-3 px-4">{pos.symbol} {pos.symbol_name}</td>
                  <td className="py-3 px-4 text-right">{pos.quantity}</td>
                  <td className="py-3 px-4 text-right">{pos.avg_cost}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
