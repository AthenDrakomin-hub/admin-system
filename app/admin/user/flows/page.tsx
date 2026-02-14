"use client";

import { useState, useEffect } from "react";
import { DollarSign, RefreshCw } from "lucide-react";

export default function FlowManagePage() {
  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFlows = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/user?action=flows');
      const data = await res.json();
      if (data.success) setFlows(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">用户流水管控</h1>
        <button onClick={fetchFlows} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>
      <div className="bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold">用户</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">类型</th>
              <th className="text-right py-3 px-4 text-sm font-semibold">金额</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">说明</th>
              <th className="text-center py-3 px-4 text-sm font-semibold">状态</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12">加载中...</td></tr>
            ) : flows.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12">暂无流水</td></tr>
            ) : (
              flows.map((flow, i) => (
                <tr key={i} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4">{flow.user_id}</td>
                  <td className="py-3 px-4">{flow.type}</td>
                  <td className="py-3 px-4 text-right">{flow.amount}</td>
                  <td className="py-3 px-4">{flow.description}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${flow.settled ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {flow.settled ? '已结清' : '未结清'}
                    </span>
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
