"use client";

import { useState, useEffect } from "react";
import { Search, Download, RefreshCw } from "lucide-react";

interface AuditLog {
  id: string;
  action: string;
  action_type: string;
  operator_name: string;
  target_type: string;
  target_id: string;
  reason?: string;
  created_at: string;
}

export default function AuditAdvancedPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    actionType: "",
    operatorName: "",
    startDate: "",
    endDate: "",
  });

  const fetchLogs = async (p = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: p.toString(),
        limit: "20",
        ...(filters.actionType && { actionType: filters.actionType }),
        ...(filters.operatorName && { operatorName: filters.operatorName }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      const res = await fetch(`/api/system/audit-advanced?${params}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data || []);
        setTotal(data.pagination.total);
        setPage(p);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [filters]);

  const handleExport = () => {
    const csv = [
      ["时间", "操作类型", "操作人", "目标类型", "目标ID", "原因"],
      ...logs.map((log) => [
        new Date(log.created_at).toLocaleString(),
        log.action_type,
        log.operator_name,
        log.target_type,
        log.target_id,
        log.reason || "-",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">审计日志高级筛选</h1>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg"
        >
          <Download className="w-4 h-4" /> 导出
        </button>
      </div>

      <div className="bg-white rounded-xl border p-6 mb-6">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="text-sm text-slate-600">操作类型</label>
            <select
              value={filters.actionType}
              onChange={(e) =>
                setFilters({ ...filters, actionType: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg mt-1"
            >
              <option value="">全部</option>
              <option value="fund_adjust">资金调整</option>
              <option value="order_modify">订单修改</option>
              <option value="user_freeze">用户冻结</option>
              <option value="config_change">配置变更</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-600">操作人</label>
            <input
              type="text"
              value={filters.operatorName}
              onChange={(e) =>
                setFilters({ ...filters, operatorName: e.target.value })
              }
              placeholder="输入操作人名称"
              className="w-full px-3 py-2 border rounded-lg mt-1"
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">开始日期</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg mt-1"
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">结束日期</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg mt-1"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-3 px-4">时间</th>
              <th className="text-left py-3 px-4">操作类型</th>
              <th className="text-left py-3 px-4">操作人</th>
              <th className="text-left py-3 px-4">目标</th>
              <th className="text-left py-3 px-4">原因</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12">
                  暂无数据
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-slate-100 rounded text-xs">
                      {log.action_type}
                    </span>
                  </td>
                  <td className="py-3 px-4">{log.operator_name}</td>
                  <td className="py-3 px-4 text-sm">
                    {log.target_type}: {log.target_id}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {log.reason || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 20 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-slate-600">
            共 {total} 条记录，第 {page} 页
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchLogs(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 border rounded-lg disabled:opacity-50"
            >
              上一页
            </button>
            <button
              onClick={() => fetchLogs(page + 1)}
              disabled={page * 20 >= total}
              className="px-4 py-2 border rounded-lg disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
