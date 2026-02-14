"use client";

import { useState, useEffect } from "react";
import { FileText, RefreshCw } from "lucide-react";

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/system?action=audit');
      const data = await res.json();
      if (data.success) setLogs(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">操作审计日志</h1>
        </div>
        <button onClick={fetchLogs} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      <div className="bg-white rounded-xl shadow border">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold">时间</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">操作类型</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">操作人</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">目标</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">原因</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12">加载中...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12">暂无审计日志</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 rounded text-xs bg-slate-100">{log.action_type}</span>
                  </td>
                  <td className="py-3 px-4">{log.operator_name}</td>
                  <td className="py-3 px-4 text-sm">{log.target_type}: {log.target_id}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{log.reason || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
