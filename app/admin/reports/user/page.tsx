"use client";

import { useState, useEffect } from "react";
import { Users, TrendingUp, RefreshCw } from "lucide-react";

interface UserReport {
  date: string;
  newUsers: number;
  activeUsers: number;
  totalUsers: number;
  retentionRate: string;
}

export default function UserReportsPage() {
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/reports/user");
      const data = await res.json();
      if (data.success) setReports(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalNewUsers = reports.reduce((sum, r) => sum + r.newUsers, 0);
  const totalActive = reports.reduce((sum, r) => sum + r.activeUsers, 0);
  const avgRetention = (
    reports.reduce((sum, r) => sum + parseFloat(r.retentionRate), 0) / reports.length
  ).toFixed(2);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">用户报表</h1>
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
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-slate-600">新增用户</p>
          <p className="text-2xl font-bold text-blue-900">{totalNewUsers}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-slate-600">活跃用户</p>
          <p className="text-2xl font-bold text-green-900">{totalActive}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <p className="text-sm text-slate-600">平均留存率</p>
          <p className="text-2xl font-bold text-purple-900">{avgRetention}%</p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <p className="text-sm text-slate-600">总用户数</p>
          <p className="text-2xl font-bold text-orange-900">
            {reports[0]?.totalUsers || 0}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-3 px-4">日期</th>
              <th className="text-right py-3 px-4">新增用户</th>
              <th className="text-right py-3 px-4">活跃用户</th>
              <th className="text-right py-3 px-4">留存率</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12">
                  暂无数据
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.date} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4">{report.date}</td>
                  <td className="py-3 px-4 text-right">{report.newUsers}</td>
                  <td className="py-3 px-4 text-right">{report.activeUsers}</td>
                  <td className="py-3 px-4 text-right">{report.retentionRate}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
