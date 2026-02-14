"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { User } from "lucide-react";

function UserDetailContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchUser();
    }
  }, [userId]);

  const fetchUser = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/user?userId=${userId}`);
      const data = await res.json();
      if (data.success && data.data?.length > 0) {
        setUser(data.data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!userId) {
    return <div className="text-center py-12">缺少用户ID</div>;
  }

  if (loading) {
    return <div className="text-center py-12">加载中...</div>;
  }

  if (!user) {
    return <div className="text-center py-12">用户不存在</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <User className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">用户详情</h1>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">基本信息</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">用户ID:</span>
              <span className="font-medium">{user.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">用户名:</span>
              <span className="font-medium">{user.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">真实姓名:</span>
              <span className="font-medium">{user.real_name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">手机号:</span>
              <span className="font-medium">{user.phone || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">身份证:</span>
              <span className="font-medium">{user.id_card || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">状态:</span>
              <span className={`px-2 py-1 rounded text-xs ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {user.status === 'active' ? '正常' : '冻结'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">创建时间:</span>
              <span className="font-medium">{new Date(user.created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold mb-4">资金信息</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">CNY余额:</span>
              <span className="font-bold text-green-600">¥{user.balance_cny?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">HKD余额:</span>
              <span className="font-bold text-green-600">HK${user.balance_hkd?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">CNY冻结:</span>
              <span className="font-medium text-orange-600">¥{user.frozen_balance_cny?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">HKD冻结:</span>
              <span className="font-medium text-orange-600">HK${user.frozen_balance_hkd?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">累计充值:</span>
              <span className="font-medium">¥{user.total_deposit?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">累计提现:</span>
              <span className="font-medium">¥{user.total_withdraw?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">交易天数:</span>
              <span className="font-medium">{user.trade_days || 0} 天</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserDetailPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">加载中...</div>}>
      <UserDetailContent />
    </Suspense>
  );
}
