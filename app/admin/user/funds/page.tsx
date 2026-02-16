"use client";

import { useState, useEffect } from "react";
import { DollarSign, AlertCircle, ChevronDown } from "lucide-react";
import { adminApi, getAdminInfo } from "@/lib/admin-api";

export default function FundsPage() {
  const [userId, setUserId] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"CNY" | "HKD">("CNY");
  const [type, setType] = useState<"add" | "subtract">("add");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    const handleClickOutside = () => setShowDropdown(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await adminApi.users.list();
      setUsers(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async () => {
    if (!userId || !amount || !reason) {
      alert('请填写完整信息');
      return;
    }
    try {
      setLoading(true);
      
      const adjustAmount = parseFloat(amount) * (type === 'subtract' ? -1 : 1);
      await adminApi.users.adjustBalance(userId, adjustAmount, currency, reason);
      
      alert('操作成功');
      setUserId('');
      setAmount('');
      setReason('');
    } catch (err: any) {
      alert(`失败: ${err.message || '操作失败'}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.id.includes(userId) || u.username?.toLowerCase().includes(userId.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <DollarSign className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">资金管理</h1>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900 mb-1">重要提示</h3>
            <p className="text-sm text-yellow-700">所有资金操作将记录审计日志，操作不可撤销</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6 max-w-2xl">
        <div className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium mb-2">用户ID</label>
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <input 
                value={userId} 
                onChange={(e) => { setUserId(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                className="w-full px-4 py-2 border rounded-lg pr-10" 
                placeholder="输入用户ID或用户名搜索" 
              />
              <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400" />
            </div>
            {showDropdown && filteredUsers.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                {filteredUsers.slice(0, 10).map(user => (
                  <div
                    key={user.id}
                    onClick={(e) => { e.stopPropagation(); setUserId(user.id); setShowDropdown(false); }}
                    className="px-4 py-2 hover:bg-slate-50 cursor-pointer border-b last:border-b-0"
                  >
                    <div className="font-medium">{user.username}</div>
                    <div className="text-xs text-slate-500">ID: {user.id} | CNY: {user.balance_cny?.toLocaleString() || 0}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">操作类型</label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setType("add")} className={`px-4 py-2 rounded-lg border-2 ${type === "add" ? "border-green-500 bg-green-50" : "border-slate-300"}`}>增加</button>
              <button onClick={() => setType("subtract")} className={`px-4 py-2 rounded-lg border-2 ${type === "subtract" ? "border-red-500 bg-red-50" : "border-slate-300"}`}>减少</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">币种</label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value as any)} className="w-full px-4 py-2 border rounded-lg" aria-label="选择币种">
              <option value="CNY">CNY</option>
              <option value="HKD">HKD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">金额</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-4 py-2 border rounded-lg" placeholder="输入金额" aria-label="金额" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">原因（必填）</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-4 py-2 border rounded-lg" rows={3} placeholder="请详细说明操作原因" />
          </div>
          <button onClick={handleSubmit} disabled={loading} className="w-full py-3 bg-primary text-white rounded-lg font-medium disabled:opacity-50">
            {loading ? '处理中...' : '确认操作'}
          </button>
        </div>
      </div>
    </div>
  );
}
