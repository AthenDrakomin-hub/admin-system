"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Search, RefreshCw, ArrowUp, ArrowDown } from "lucide-react";

interface Quote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  amount: number;
}

export default function MarketPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [addSymbol, setAddSymbol] = useState("");

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/market?symbols=${watchlist.join(',')}`);
      const data = await res.json();
      if (data.success) {
        setQuotes(data.data);
      }
    } catch (error) {
      console.error('Fetch quotes error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = () => {
    if (addSymbol && !watchlist.includes(addSymbol)) {
      setWatchlist([...watchlist, addSymbol]);
      setAddSymbol("");
    }
  };

  const handleRemoveStock = (symbol: string) => {
    setWatchlist(watchlist.filter(s => s !== symbol));
  };

  useEffect(() => {
    // 从数据库加载股票池
    fetch('/api/market/stocks')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          setWatchlist(data.data.map((s: any) => s.symbol));
        }
      });
  }, []);

  useEffect(() => {
    if (watchlist.length === 0) return;
    
    const isMarketOpen = () => {
      const now = new Date();
      const hour = now.getHours();
      const day = now.getDay();
      if (day === 0 || day === 6) return false;
      const isMorning = hour === 9 && now.getMinutes() >= 30 || hour === 10 || hour === 11 && now.getMinutes() <= 30;
      const isAfternoon = hour === 13 || hour === 14 || hour === 15 && now.getMinutes() === 0;
      return isMorning || isAfternoon;
    };

    fetchQuotes();
    const interval = setInterval(() => {
      if (isMarketOpen()) fetchQuotes();
    }, 5000);
    return () => clearInterval(interval);
  }, [watchlist]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-slate-900">实时行情</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={addSymbol}
              onChange={(e) => setAddSymbol(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddStock()}
              placeholder="输入股票代码"
              className="px-3 py-2 border rounded-lg text-sm w-32"
            />
            <button
              onClick={handleAddStock}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
            >
              添加
            </button>
          </div>
          <button
            onClick={fetchQuotes}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-700">
          <strong>数据来源：</strong>新浪财经免费接口 | 延迟约15秒 | 每5秒自动刷新
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">股票代码</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">股票名称</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">最新价</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">涨跌额</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">涨跌幅</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">成交量</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">成交额</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading && quotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    加载中...
                  </td>
                </tr>
              ) : quotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    暂无行情数据
                  </td>
                </tr>
              ) : (
                quotes.map((quote) => (
                  <tr key={quote.symbol} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-sm">{quote.symbol}</td>
                    <td className="py-3 px-4 font-medium">{quote.name}</td>
                    <td className={`py-3 px-4 text-right font-bold ${
                      quote.change > 0 ? 'text-red-600' : quote.change < 0 ? 'text-green-600' : 'text-slate-900'
                    }`}>
                      ¥{quote.price.toFixed(2)}
                    </td>
                    <td className={`py-3 px-4 text-right ${
                      quote.change > 0 ? 'text-red-600' : quote.change < 0 ? 'text-green-600' : 'text-slate-600'
                    }`}>
                      <div className="flex items-center justify-end gap-1">
                        {quote.change > 0 ? <ArrowUp className="w-4 h-4" /> : quote.change < 0 ? <ArrowDown className="w-4 h-4" /> : null}
                        {quote.change > 0 ? '+' : ''}{quote.change.toFixed(2)}
                      </div>
                    </td>
                    <td className={`py-3 px-4 text-right font-semibold ${
                      quote.changePercent > 0 ? 'text-red-600' : quote.changePercent < 0 ? 'text-green-600' : 'text-slate-600'
                    }`}>
                      {quote.changePercent > 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      {(quote.volume / 10000).toFixed(2)}万手
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      {(quote.amount / 100000000).toFixed(2)}亿
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleRemoveStock(quote.symbol)}
                        className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                      >
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
    </div>
  );
}
