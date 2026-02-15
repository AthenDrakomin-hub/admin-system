"use client";

import { useState, useEffect } from "react";
import { Users, RefreshCw, Lock, Unlock, Eye, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { adminApi, getAdminInfo } from "@/lib/admin-api";

export default function UserListPage() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminApi.users.list();
      setUsers(data.data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 冻结/解冻用户
  const handleToggleFreeze = async (userId: string, currentStatus: string) => {
    const adminInfo = getAdminInfo();
    const isFrozen = currentStatus !== 'active';
    
    if (!confirm(`确定要${isFrozen ? '解冻' : '冻结'}该用户吗？`)) return;
    
    const reason = prompt(`请输入${isFrozen ? '解冻' : '冻结'}原因：`) || '';
    if (!reason && !isFrozen) {
      alert('请输入冻结原因');
      return;
    }

    try {
      if (isFrozen) {
        await adminApi.users.unfreeze(userId, reason);
      } else {
        await adminApi.users.freeze(userId, reason);
      }
      alert('操作成功');
      fetchUsers();
    } catch (err: any) {
      alert(err.message || '操作失败');
    }
  };

  // 重置密码
  const handleResetPassword = async (userId: string) => {
    if (!confirm('确定要重置该用户密码吗？')) return;
    
    try {
      await adminApi.users.resetPassword(userId);
      alert('密码已重置为默认密码');
    } catch (err: any) {
      alert(err.message || '操作失败');
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
        <div className="flex gap-2">
          <button 
            onClick={() => router.push('/admin/user/create')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            新建用户
          </button>
          <button 
            onClick={fetchUsers} 
            disabled={loading} 
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

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
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => handleToggleFreeze(user.id, user.status)}
                        className={`px-2 py-1 rounded text-xs ${user.status === 'active' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                        title={user.status === 'active' ? '冻结' : '解冻'}
                      >
                        {user.status === 'active' ? <Lock className="w-3 h-3 inline" /> : <Unlock className="w-3 h-3 inline" />}
                      </button>
                      <button
                        onClick={() => handleResetPassword(user.id)}
                        className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs hover:bg-orange-200"
                        title="重置密码"
                      >
                        重置
                      </button>
                      <button
                        onClick={() => {
                          window.open(`/admin/user/detail?userId=${user.id}`, '_blank');
                        }}
                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                      >
                        <Eye className="w-3 h-3 inline" />
                      </button>
                    </div>
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
