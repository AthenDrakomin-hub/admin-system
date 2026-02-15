"use client";

import { useState, useEffect } from "react";
import { 
  Bell, 
  TrendingUp, 
  DollarSign, 
  CreditCard, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Users
} from "lucide-react";
import Link from "next/link";
import { adminApi } from "@/lib/admin-api";

interface DashboardStats {
  pendingTrades: number;
  pendingWithdraws: number;
  pendingRecharges: number;
  abnormalOrders: number;
  todayTrades: number;
  todayAmount: number;
  activeUsers: number;
  timestamp?: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // 获取实时监控数据
  const fetchStats = async () => {
    try {
      const data = await adminApi.monitor.realtime();
      
      // 从实时数据中提取需要的信息
      const orders = data.data?.orders || {};
      const users = data.data?.users || {};
      const market = data.data?.market || {};
      
      setStats({
        pendingTrades: orders.pending || 0,
        pendingWithdraws: 0,  // 需要从财务模块获取
        pendingRecharges: 0,  // 需要从财务模块获取
        abnormalOrders: market.active_alerts || 0,
        todayTrades: orders.today_total || 0,
        todayAmount: 0,  // 需要计算
        activeUsers: users.online || 0,
        timestamp: data.data?.timestamp
      });
    } catch (err) {
      console.error('获取监控数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // 设置定时刷新，每30秒刷新一次
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const displayStats = stats || {
    pendingTrades: 0,
    pendingWithdraws: 0,
    pendingRecharges: 0,
    abnormalOrders: 0,
    todayTrades: 0,
    todayAmount: 0,
    activeUsers: 0,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">统一待办工作台</h1>
          <p className="text-slate-500 text-sm mt-1">
            实时监控业务状态，快速处理待办事项 {stats?.timestamp && `· 更新于 ${new Date(stats.timestamp).toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
          <Bell className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-slate-700">
            {displayStats.pendingTrades + displayStats.pendingWithdraws + displayStats.pendingRecharges} 个待办
          </span>
          {loading && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
        </div>
      </div>

      {/* 数据概览面板 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-700 text-sm font-medium">今日成交</span>
            <CheckCircle className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-900">{displayStats.todayTrades}</p>
          <p className="text-xs text-blue-600 mt-1">笔</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-700 text-sm font-medium">今日成交额</span>
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900">¥{displayStats.todayAmount.toLocaleString()}</p>
          <p className="text-xs text-green-600 mt-1">元</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-700 text-sm font-medium">活跃用户</span>
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-purple-900">{displayStats.activeUsers}</p>
          <p className="text-xs text-purple-600 mt-1">人</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-700 text-sm font-medium">异常订单</span>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-900">{displayStats.abnormalOrders}</p>
          <p className="text-xs text-red-600 mt-1">待处理</p>
        </div>
      </div>

      {/* 待办事项 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Link href="/admin/trade/a-share">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 hover:shadow-lg transition cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-bold">
                {displayStats.pendingTrades}
              </span>
            </div>
            <h3 className="text-slate-700 font-medium mb-1">待审核交易</h3>
            <p className="text-xs text-slate-500">点击查看详情</p>
          </div>
        </Link>

        <Link href="/admin/finance/withdraw">
          <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border border-red-200 hover:shadow-lg transition cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <DollarSign className="w-8 h-8 text-red-600" />
              <span className="px-3 py-1 bg-red-600 text-white rounded-full text-sm font-bold">
                {displayStats.pendingWithdraws}
              </span>
            </div>
            <h3 className="text-slate-700 font-medium mb-1">待审核提现</h3>
            <p className="text-xs text-slate-500">点击查看详情</p>
          </div>
        </Link>

        <Link href="/admin/finance/recharge">
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 hover:shadow-lg transition cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <CreditCard className="w-8 h-8 text-green-600" />
              <span className="px-3 py-1 bg-green-600 text-white rounded-full text-sm font-bold">
                {displayStats.pendingRecharges}
              </span>
            </div>
            <h3 className="text-slate-700 font-medium mb-1">待审核充值</h3>
            <p className="text-xs text-slate-500">点击查看详情</p>
          </div>
        </Link>

        <Link href="/admin/trade/abnormal">
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-xl border border-yellow-200 hover:shadow-lg transition cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
              <span className="px-3 py-1 bg-yellow-600 text-white rounded-full text-sm font-bold">
                {displayStats.abnormalOrders}
              </span>
            </div>
            <h3 className="text-slate-700 font-medium mb-1">异常订单</h3>
            <p className="text-xs text-slate-500">点击查看详情</p>
          </div>
        </Link>
      </div>

      {/* 今日数据 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">今日成交笔数</span>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{displayStats.todayTrades}</p>
          <p className="text-xs text-slate-500 mt-1">比昨日 +0%</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">今日成交金额</span>
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold text-slate-900">¥{displayStats.todayAmount.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">比昨日 +0%</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600 text-sm">活跃用户数</span>
            <Users className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{displayStats.activeUsers}</p>
          <p className="text-xs text-slate-500 mt-1">比昨日 +0%</p>
        </div>
      </div>

      {/* 最近操作 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">最近操作记录</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <Clock className="w-5 h-5 text-slate-400" />
            <div className="flex-1">
              <p className="text-sm text-slate-700">暂无操作记录</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
