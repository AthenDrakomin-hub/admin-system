"use client";

import { useState, useEffect } from "react";
import { Shield, RefreshCw } from "lucide-react";

export default function AdminManagePage() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/system?action=admins');
      const data = await res.json();
      if (data.success) setAdmins(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">管理员账号管理</h1>
        <button onClick={fetchAdmins} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>
      <div className="bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold">用户名</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">角色</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">创建时间</th>
              <th className="text-left py-3 px-4 text-sm font-semibold">最后登录</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-12">加载中...</td></tr>
            ) : admins.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-12">暂无管理员</td></tr>
            ) : (
              admins.map((admin) => (
                <tr key={admin.id} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium">{admin.username}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${admin.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {admin.role === 'super_admin' ? '系统管理员' : '普通管理员'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{new Date(admin.created_at).toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{admin.last_login ? new Date(admin.last_login).toLocaleString() : '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
