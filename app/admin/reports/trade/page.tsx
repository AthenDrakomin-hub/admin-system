"use client";

import { useState, useEffect } from "react";
import { BarChart3, Download, RefreshCw } from "lucide-react";

export default function TradeReportPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('today');

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/system?action=trade_report&range=${dateRange}`);
      const data = await res.json();
      if (data.success) setReport(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [dateRange]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">交易报表</h1>
        </div>
        <div className="flex gap-2">
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="px-4 py-2 border rounded-lg" aria-label="选择日期范围">
            <option value="today">今日</option>
            <option value="week">本周</option>
            <option value="month">本月</option>
          </select>
          <button onClick={fetchReport} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg">
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-xl border">
          <div className="text-sm text-slate-600 mb-2">总成交笔数</div>
          <div className="text-3xl font-bold">{report?.total_count || 0}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border">
          <div className="text-sm text-slate-600 mb-2">总成交额</div>
          <div className="text-3xl font-bold">¥{(report?.total_amount || 0).toLocaleString()}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border">
          <div className="text-sm text-slate-600 mb-2">手续费收入</div>
          <div className="text-3xl font-bold">¥{(report?.total_fee || 0).toLocaleString()}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border">
          <div className="text-sm text-slate-600 mb-2">参与用户数</div>
          <div className="text-3xl font-bold">{report?.user_count || 0}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h2 className="text-lg font-semibold mb-4">按交易类型统计</h2>
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold">交易类型</th>
              <th className="text-right py-3 px-4 text-sm font-semibold">笔数</th>
              <th className="text-right py-3 px-4 text-sm font-semibold">成交额</th>
              <th className="text-right py-3 px-4 text-sm font-semibold">手续费</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-12">加载中...</td></tr>
            ) : !report?.by_type ? (
              <tr><td colSpan={4} className="text-center py-12">暂无数据</td></tr>
            ) : (
              Object.entries(report.by_type).map(([type, data]: any) => (
                <tr key={type} className="border-b">
                  <td className="py-3 px-4">{type}</td>
                  <td className="py-3 px-4 text-right">{data.count}</td>
                  <td className="py-3 px-4 text-right">¥{data.amount.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right">¥{data.fee.toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
