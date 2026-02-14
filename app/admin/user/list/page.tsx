"use client";

import { useState, useEffect } from "react";
import { Users, RefreshCw, Lock, Unlock, Eye } from "lucide-react";

export default function UserListPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/user');
      const data = await res.json();
      if (data.success) setUsers(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">用户管理</h1>
        </div>
        <button onClick={fetchUsers} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      <div className="bg-white rounded-xl shadow border">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold">用户名</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">真实姓名</th>
              <th className="text-right py-3 px-4 text-sm font-semibold">CNY余额</th>
              <th className="text-right py-3 px-4 text-sm font-semibold">HKD余额</th>
              <th className="text-center py-3 px-4 text-sm font-semibold">状态</th>
              <th className="text-center py-3 px-4 text-sm font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12">加载中...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12">暂无用户</td></tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium">{user.username}</td>
                  <td className="py-3 px-4">{user.real_name || '-'}</td>
                  <td className="py-3 px-4 text-right">{user.balance_cny?.toLocaleString() || 0}</td>
                  <td className="py-3 px-4 text-right">{user.balance_hkd?.toLocaleString() || 0}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {user.status === 'active' ? '正常' : '冻结'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => {
                        window.open(`/admin/user/detail?userId=${user.id}`, '_blank');
                      }}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      <Eye className="w-4 h-4 inline" />
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
