"use client";

import { useState, useEffect } from "react";
import { Shield, Save } from "lucide-react";

export default function RiskRulesPage() {
  const [rules, setRules] = useState({
    board_daily_limit: 100000,
    withdraw_single_limit: 1000000,
    withdraw_daily_limit: 5000000,
    trade_daily_count: 100,
    block_min_amount: 2000000,
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_risk_rules', rules }),
      });
      const data = await res.json();
      if (data.success) {
        alert('保存成功');
      } else {
        alert(`失败: ${data.error}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">风控规则配置</h1>
        </div>
        <button onClick={handleSave} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg">
          <Save className="w-4 h-4" />
          {loading ? '保存中...' : '保存配置'}
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">打板交易限额</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">单日用户限额（元）</label>
              <input type="number" value={rules.board_daily_limit} onChange={(e) => setRules({...rules, board_daily_limit: parseInt(e.target.value)})} className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">提现限额</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">单笔限额（元）</label>
              <input type="number" value={rules.withdraw_single_limit} onChange={(e) => setRules({...rules, withdraw_single_limit: parseInt(e.target.value)})} className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">单日限额（元）</label>
              <input type="number" value={rules.withdraw_daily_limit} onChange={(e) => setRules({...rules, withdraw_daily_limit: parseInt(e.target.value)})} className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">交易频率</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">单日交易笔数上限</label>
              <input type="number" value={rules.trade_daily_count} onChange={(e) => setRules({...rules, trade_daily_count: parseInt(e.target.value)})} className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">大宗交易</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">最低金额（元）</label>
              <input type="number" value={rules.block_min_amount} onChange={(e) => setRules({...rules, block_min_amount: parseInt(e.target.value)})} className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
