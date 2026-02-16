"use client";

import { useState, useEffect } from "react";
import { FileText, Download } from "lucide-react";

interface FinanceReport {
  period: string;
  totalRecharge: number;
  totalWithdraw: number;
  totalFee: number;
  netFlow: number;
  abnormalTransactions: number;
}

export default function FinanceReportsPage() {
  const [reportType, setReportType] = useState<"day" | "month" | "quarter">("month");
  const [reports, setReports] = useState<FinanceReport[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReports();
  }, [reportType]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/finance/reports?type=${reportType}`);
      const result = await res.json();
      if (result.success) setReports(result.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: "excel" | "pdf") => {
    if (format === "excel") {
      const csv = [
        ["周期", "充值总额", "提现总额", "交易手续费", "净流水", "异常交易"],
        ...reports.map((r) => [
          r.period,
          r.totalRecharge,
          r.totalWithdraw,
          r.totalFee,
          r.netFlow,
          r.abnormalTransactions,
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `finance-report-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">财务报表</h1>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport("excel")}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg"
          >
            <Download className="w-4 h-4" /> Excel
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg"
          >
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      <div className="mb-6 flex gap-4">
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value as any)}
          className="px-4 py-2 border rounded-lg"
          aria-label="选择报表类型"
        >
          <option value="day">按日</option>
          <option value="month">按月</option>
          <option value="quarter">按季度</option>
        </select>
        <button
          onClick={fetchReports}
          disabled={loading}
          className="px-4 py-2 bg-primary text-white rounded-lg"
        >
          生成报表
        </button>
      </div>

      <div className="bg-white rounded-xl border">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-3 px-4">周期</th>
              <th className="text-right py-3 px-4">充值总额</th>
              <th className="text-right py-3 px-4">提现总额</th>
              <th className="text-right py-3 px-4">交易手续费</th>
              <th className="text-right py-3 px-4">净流水</th>
              <th className="text-right py-3 px-4">异常交易</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12">
                  暂无数据
                </td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr key={report.period} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4">{report.period}</td>
                  <td className="py-3 px-4 text-right">
                    ¥{report.totalRecharge.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    ¥{report.totalWithdraw.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    ¥{report.totalFee.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold">
                    ¥{report.netFlow.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {report.abnormalTransactions}
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
