"use client";

import { useState, useEffect } from "react";
import { BarChart3, Download, RefreshCw } from "lucide-react";

interface ReconciliationData {
  date: string;
  totalRecharge: number;
  totalWithdraw: number;
  balanceChange: number;
  difference: number;
  status: "matched" | "mismatch";
}

export default function ReconciliationPage() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [data, setData] = useState<ReconciliationData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReconciliation();
  }, [period]);

  const fetchReconciliation = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/finance/reconciliation?period=${period}`);
      const result = await res.json();
      if (result.success) setData(result.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    const csv = [
      ["日期", "充值总额", "提现总额", "余额变动", "差异", "状态"],
      ...data.map((row) => [
        row.date,
        row.totalRecharge,
        row.totalWithdraw,
        row.balanceChange,
        row.difference,
        row.status,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reconciliation-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">流水对账</h1>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg"
        >
          <Download className="w-4 h-4" /> 导出报告
        </button>
      </div>

      <div className="mb-6 flex gap-4">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as any)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="day">按日</option>
          <option value="week">按周</option>
          <option value="month">按月</option>
        </select>
        <button
          onClick={fetchReconciliation}
          disabled={loading}
          className="px-4 py-2 bg-primary text-white rounded-lg"
        >
          <RefreshCw className={`w-4 h-4 inline mr-2 ${loading ? "animate-spin" : ""}`} />
          查询
        </button>
      </div>

      <div className="bg-white rounded-xl border">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-3 px-4">日期</th>
              <th className="text-right py-3 px-4">充值总额</th>
              <th className="text-right py-3 px-4">提现总额</th>
              <th className="text-right py-3 px-4">余额变动</th>
              <th className="text-right py-3 px-4">差异</th>
              <th className="text-center py-3 px-4">状态</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  暂无数据
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.date} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4">{row.date}</td>
                  <td className="py-3 px-4 text-right">
                    ¥{row.totalRecharge.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    ¥{row.totalWithdraw.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    ¥{row.balanceChange.toLocaleString()}
                  </td>
                  <td
                    className={`py-3 px-4 text-right ${
                      row.difference === 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    ¥{row.difference.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        row.status === "matched"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {row.status === "matched" ? "匹配" : "不匹配"}
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
