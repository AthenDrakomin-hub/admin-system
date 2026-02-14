"use client";

import { useState, useEffect } from "react";
import { BarChart3, RefreshCw } from "lucide-react";

interface MarketReport {
  date: string;
  successRate: number;
  topStocks: string[];
  refreshCount: number;
  avgResponseTime: number;
}

export default function MarketReportsPage() {
  const [reports, setReports] = useState<MarketReport[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/reports/market");
      const data = await res.json();
      if (data.success) setReports(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const avgSuccess =
    reports.length > 0
      ? (reports.reduce((sum, r) => sum + r.successRate, 0) / reports.length).toFixed(2)
      : 0;
  const totalRefresh = reports.reduce((sum, r) => sum + r.refreshCount, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">行情报表</h1>
        <button
          onClick={fetchReports}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          刷新
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-slate-600">平均成功率</p>
          <p className="text-2xl font-bold text-green-900">{avgSuccess}%</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-slate-600">总刷新次数</p>
          <p className="text-2xl font-bold text-blue-900">{totalRefresh}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <p className="text-sm text-slate-600">平均响应时间</p>
          <p className="text-2xl font-bold text-purple-900">
            {reports.length > 0
              ? (
                  reports.reduce((sum, r) => sum + r.avgResponseTime, 0) /
                  reports.length
                ).toFixed(0)
              : 0}
            ms
          </p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <p className="text-sm text-slate-600">热门股票</p>
          <p className="text-lg font-bold text-orange-900">
            {reports[0]?.topStocks[0] || "-"}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-3 px-4">日期</th>
              <th className="text-right py-3 px-4">成功率</th>
              <th className="text-left py-3 px-4">热门股票</th>
              <th className="text-right py-3 px-4">刷新次数</th>
              <th className="text-right py-3 px-4">平均响应时间</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12">
                  暂无数据
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.date} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4">{report.date}</td>
                  <td className="py-3 px-4 text-right">{report.successRate}%</td>
                  <td className="py-3 px-4">{report.topStocks.join(", ")}</td>
                  <td className="py-3 px-4 text-right">{report.refreshCount}</td>
                  <td className="py-3 px-4 text-right">{report.avgResponseTime}ms</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
