"use client";

import { useState, useEffect } from "react";
import { AlertCircle, AlertTriangle, Info, RefreshCw } from "lucide-react";

interface SystemLog {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "error";
  service: string;
  message: string;
  details: string;
}

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = async (p = 1) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/system/logs?type=${filter}&page=${p}&limit=20`);
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
  }, [filter]);

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Info className="w-4 h-4 text-blue-600" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "error":
        return "bg-red-50 border-red-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">系统运行日志</h1>
        <button
          onClick={() => fetchLogs(page)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </button>
      </div>

      <div className="mb-6 flex gap-2">
        {["all", "info", "warning", "error"].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg ${
              filter === type
                ? "bg-primary text-white"
                : "bg-white border text-slate-700"
            }`}
          >
            {type === "all"
              ? "全部"
              : type === "info"
              ? "信息"
              : type === "warning"
              ? "警告"
              : "错误"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {logs.length === 0 ? (
          <div className="text-center py-12 text-slate-500">暂无日志</div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`p-4 rounded-lg border ${getLevelColor(log.level)}`}
            >
              <div className="flex items-start gap-3">
                {getLevelIcon(log.level)}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-slate-900">{log.message}</h3>
                    <span className="text-xs text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{log.details}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    服务: {log.service}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
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
