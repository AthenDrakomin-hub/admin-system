"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Plus, CheckCircle, RefreshCw } from "lucide-react";

interface Anomaly {
  id: string;
  symbol: string;
  type: string;
  reason: string;
  status: "active" | "resolved";
  created_at: string;
}

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ symbol: "", type: "error", reason: "" });

  useEffect(() => {
    fetchAnomalies();
  }, []);

  const fetchAnomalies = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/market/anomalies");
      const data = await res.json();
      if (data.success) setAnomalies(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.symbol || !form.reason) {
      alert("请填写所有必要信息");
      return;
    }

    try {
      const res = await fetch("/api/market/anomalies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          symbol: form.symbol,
          type: form.type,
          reason: form.reason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("标记成功");
        setForm({ symbol: "", type: "error", reason: "" });
        setShowForm(false);
        fetchAnomalies();
      }
    } catch (err) {
      alert("标记失败");
    }
  };

  const handleResolve = async (anomalyId: string) => {
    try {
      const res = await fetch("/api/market/anomalies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve", anomalyId }),
      });

      const data = await res.json();
      if (data.success) {
        fetchAnomalies();
      }
    } catch (err) {
      alert("操作失败");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">行情异常标记</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg"
        >
          <Plus className="w-4 h-4" /> 标记异常
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">股票代码</label>
              <input
                type="text"
                value={form.symbol}
                onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                placeholder="如：600000"
                className="w-full px-3 py-2 border rounded-lg mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">异常类型</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg mt-1"
              >
                <option value="error">错误数据</option>
                <option value="outdated">过期数据</option>
                <option value="timeout">超时</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">异常原因</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="描述异常原因"
                className="w-full px-3 py-2 border rounded-lg mt-1"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg"
              >
                标记
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-3 px-4">股票代码</th>
              <th className="text-left py-3 px-4">异常类型</th>
              <th className="text-left py-3 px-4">原因</th>
              <th className="text-center py-3 px-4">状态</th>
              <th className="text-center py-3 px-4">操作</th>
            </tr>
          </thead>
          <tbody>
            {anomalies.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12">
                  暂无异常记录
                </td>
              </tr>
            ) : (
              anomalies.map((anomaly) => (
                <tr key={anomaly.id} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium">{anomaly.symbol}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-yellow-100 rounded text-xs">
                      {anomaly.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm">{anomaly.reason}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        anomaly.status === "active"
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {anomaly.status === "active" ? "活跃" : "已解决"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {anomaly.status === "active" && (
                      <button
                        onClick={() => handleResolve(anomaly.id)}
                        className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs"
                      >
                        <CheckCircle className="w-3 h-3 inline mr-1" />
                        解决
                      </button>
                    )}
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
