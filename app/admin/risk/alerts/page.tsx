"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw, Lock } from "lucide-react";

export default function RiskAlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/system?action=risk_alerts');
      const data = await res.json();
      
      if (data.success) {
        // 确保 data.data 是数组，如果不是则转换为空数组
        const alertsData = data.data;
        if (Array.isArray(alertsData)) {
          setAlerts(alertsData);
        } else {
          // 如果 data.data 不是数组，设置为空数组
          console.warn('API返回的风险预警数据不是数组:', alertsData);
          setAlerts([]);
        }
      } else {
        // API返回失败，设置为空数组
        setAlerts([]);
      }
    } catch (err) {
      console.error('获取风险预警数据失败:', err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          <h1 className="text-2xl font-bold">风险预警列表</h1>
        </div>
        <button onClick={fetchAlerts} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      <div className="bg-white rounded-xl shadow border">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold">时间</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">用户</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">风险类型</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">详情</th>
              <th className="text-center py-3 px-4 text-sm font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12">加载中...</td></tr>
            ) : !alerts || alerts.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12">暂无风险预警</td></tr>
            ) : (
              alerts?.map((alert, i) => (
                <tr key={i} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm">{new Date(alert.created_at).toLocaleString()}</td>
                  <td className="py-3 px-4">{alert.user_id}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-700">{alert.risk_type}</span>
                  </td>
                  <td className="py-3 px-4 text-sm">{alert.details}</td>
                  <td className="py-3 px-4 text-center">
                    <button className="px-3 py-1 bg-red-100 text-red-700 rounded">
                      <Lock className="w-4 h-4 inline mr-1" />
                      冻结
                    </button>
                  </td>
                </tr>
              )) || null
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
