"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, RefreshCw, Edit2 } from "lucide-react";

interface Stock {
  id: string;
  symbol: string;
  enabled: boolean;
  refresh_rate: number;
  created_at: string;
}

export default function StocksPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ symbol: "", refreshRate: 5 });

  useEffect(() => {
    fetchStocks();
  }, []);

  const fetchStocks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/market/stocks");
      const data = await res.json();
      if (data.success) setStocks(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.symbol) {
      alert("请输入股票代码");
      return;
    }

    try {
      const res = await fetch("/api/market/stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          symbol: form.symbol,
          refreshRate: form.refreshRate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert("添加成功");
        setForm({ symbol: "", refreshRate: 5 });
        setShowForm(false);
        fetchStocks();
      }
    } catch (err) {
      alert("添加失败");
    }
  };

  const handleToggle = async (stock: Stock) => {
    try {
      const res = await fetch("/api/market/stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update",
          stockId: stock.id,
          enabled: !stock.enabled,
          refreshRate: stock.refresh_rate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        fetchStocks();
      }
    } catch (err) {
      alert("操作失败");
    }
  };

  const handleDelete = async (stockId: string) => {
    if (!confirm("确定要删除此股票吗？")) return;

    try {
      const res = await fetch("/api/market/stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", stockId }),
      });

      const data = await res.json();
      if (data.success) {
        fetchStocks();
      }
    } catch (err) {
      alert("删除失败");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">股票池管理</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg"
        >
          <Plus className="w-4 h-4" /> 添加股票
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
              <label className="text-sm font-medium">刷新频率（秒）</label>
              <input
                type="number"
                value={form.refreshRate}
                onChange={(e) =>
                  setForm({ ...form, refreshRate: parseInt(e.target.value) })
                }
                min="1"
                max="60"
                className="w-full px-3 py-2 border rounded-lg mt-1"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg"
              >
                添加
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
              <th className="text-center py-3 px-4">状态</th>
              <th className="text-right py-3 px-4">刷新频率</th>
              <th className="text-center py-3 px-4">操作</th>
            </tr>
          </thead>
          <tbody>
            {stocks.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12">
                  暂无股票
                </td>
              </tr>
            ) : (
              stocks.map((stock) => (
                <tr key={stock.id} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium">{stock.symbol}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        stock.enabled
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {stock.enabled ? "启用" : "禁用"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">{stock.refresh_rate}s</td>
                  <td className="py-3 px-4 text-center space-x-2">
                    <button
                      onClick={() => handleToggle(stock)}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                    >
                      <Edit2 className="w-3 h-3 inline mr-1" />
                      {stock.enabled ? "禁用" : "启用"}
                    </button>
                    <button
                      onClick={() => handleDelete(stock.id)}
                      className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs"
                    >
                      <Trash2 className="w-3 h-3 inline mr-1" />
                      删除
                    </button>
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
