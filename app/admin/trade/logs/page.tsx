"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

interface OrderLog {
  id: string;
  action: string;
  operator_name: string;
  before_data?: any;
  after_data?: any;
  reason?: string;
  created_at: string;
}

export default function OrderLogsPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [logs, setLogs] = useState<OrderLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchLogs();
    }
  }, [orderId]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/trade/logs?orderId=${orderId}`);
      const data = await res.json();
      if (data.success) setLogs(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!orderId) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">缺少订单ID</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/trade/a-share" className="text-primary hover:underline">
            <ArrowLeft className="w-5 h-5 inline mr-2" />
            返回
          </Link>
          <h1 className="text-2xl font-bold">订单操作日志</h1>
          <span className="text-sm text-slate-500">订单ID: {orderId}</span>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </button>
      </div>

      <div className="space-y-4">
        {logs.length === 0 ? (
          <div className="text-center py-12 text-slate-500">暂无操作记录</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="bg-white rounded-xl border p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-slate-900">{log.action}</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    操作人: {log.operator_name}
                  </p>
                </div>
                <span className="text-sm text-slate-500">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>

              {log.reason && (
                <div className="mb-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    <strong>原因:</strong> {log.reason}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {log.before_data && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">
                      修改前
                    </h4>
                    <pre className="text-xs bg-slate-50 p-3 rounded overflow-auto max-h-40">
                      {JSON.stringify(log.before_data, null, 2)}
                    </pre>
                  </div>
                )}
                {log.after_data && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 mb-2">
                      修改后
                    </h4>
                    <pre className="text-xs bg-slate-50 p-3 rounded overflow-auto max-h-40">
                      {JSON.stringify(log.after_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
