"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, ChevronDown, ChevronRight } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['trade', 'user', 'finance', 'system', 'risk', 'reports']);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      localStorage.clear();
      document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      router.push('/login');
    }
  };

  const toggleMenu = (menu: string) => {
    setExpandedMenus(prev => 
      prev.includes(menu) ? prev.filter(m => m !== menu) : [...prev, menu]
    );
  };

  const isActive = (path: string) => pathname === path;

  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-slate-900 text-white p-4 flex flex-col overflow-y-auto">
        <h1 className="text-lg font-bold mb-6">银河证券-证裕交易</h1>
        
        <nav className="space-y-1 flex-1">
          {/* 工作台 */}
          <a href="/admin/dashboard" className={`block py-2 px-4 rounded ${isActive('/admin/dashboard') ? 'bg-primary' : 'hover:bg-slate-800'}`}>
            🏠 工作台
          </a>

          {/* 交易审核 */}
          <div>
            <button onClick={() => toggleMenu('trade')} className="w-full flex items-center justify-between py-2 px-4 rounded hover:bg-slate-800">
              <span>📊 交易审核</span>
              {expandedMenus.includes('trade') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {expandedMenus.includes('trade') && (
              <div className="ml-4 mt-1 space-y-1">
                <a href="/admin/trade/a-share" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/trade/a-share') ? 'bg-primary' : 'hover:bg-slate-800'}`}>A股审核</a>
                <a href="/admin/trade/hk-share" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/trade/hk-share') ? 'bg-primary' : 'hover:bg-slate-800'}`}>港股审核</a>
                <a href="/admin/trade/ipo" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/trade/ipo') ? 'bg-primary' : 'hover:bg-slate-800'}`}>新股申购</a>
                <a href="/admin/trade/block" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/trade/block') ? 'bg-primary' : 'hover:bg-slate-800'}`}>大宗交易</a>
                <a href="/admin/trade/board" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/trade/board') ? 'bg-primary' : 'hover:bg-slate-800'}`}>打板交易</a>
                <a href="/admin/trade/abnormal" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/trade/abnormal') ? 'bg-primary text-red-400' : 'hover:bg-slate-800 text-red-400'}`}>⚠️ 异常订单</a>
                <a href="/admin/trade/logs" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/trade/logs') ? 'bg-primary' : 'hover:bg-slate-800'}`}>操作日志</a>
              </div>
            )}
          </div>

          {/* 用户管理 */}
          <div>
            <button onClick={() => toggleMenu('user')} className="w-full flex items-center justify-between py-2 px-4 rounded hover:bg-slate-800">
              <span>👥 用户管理</span>
              {expandedMenus.includes('user') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {expandedMenus.includes('user') && (
              <div className="ml-4 mt-1 space-y-1">
                <a href="/admin/user/list" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/user/list') ? 'bg-primary' : 'hover:bg-slate-800'}`}>用户列表</a>
                <a href="/admin/user/funds" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/user/funds') ? 'bg-primary' : 'hover:bg-slate-800'}`}>资金管理</a>
                <a href="/admin/user/positions" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/user/positions') ? 'bg-primary' : 'hover:bg-slate-800'}`}>持仓管理</a>
                <a href="/admin/user/orders" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/user/orders') ? 'bg-primary' : 'hover:bg-slate-800'}`}>订单查询</a>
                <a href="/admin/user/flows" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/user/flows') ? 'bg-primary' : 'hover:bg-slate-800'}`}>流水查询</a>
                <a href="/admin/user/status" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/user/status') ? 'bg-primary' : 'hover:bg-slate-800'}`}>用户状态管理</a>
                <a href="/admin/user/messages" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/user/messages') ? 'bg-primary' : 'hover:bg-slate-800'}`}>消息推送</a>
              </div>
            )}
          </div>

          {/* 财务审核 */}
          <div>
            <button onClick={() => toggleMenu('finance')} className="w-full flex items-center justify-between py-2 px-4 rounded hover:bg-slate-800">
              <span>💰 财务审核</span>
              {expandedMenus.includes('finance') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {expandedMenus.includes('finance') && (
              <div className="ml-4 mt-1 space-y-1">
                <a href="/admin/finance/recharge" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/finance/recharge') ? 'bg-primary' : 'hover:bg-slate-800'}`}>充值审核</a>
                <a href="/admin/finance/withdraw" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/finance/withdraw') ? 'bg-primary' : 'hover:bg-slate-800'}`}>提现审核</a>
                <a href="/admin/finance/reconciliation" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/finance/reconciliation') ? 'bg-primary' : 'hover:bg-slate-800'}`}>流水对账</a>
                <a href="/admin/finance/reports" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/finance/reports') ? 'bg-primary' : 'hover:bg-slate-800'}`}>财务报表</a>
              </div>
            )}
          </div>

          {/* 行情管理 */}
          <div>
            <button onClick={() => toggleMenu('market')} className="w-full flex items-center justify-between py-2 px-4 rounded hover:bg-slate-800">
              <span>📈 行情管理</span>
              {expandedMenus.includes('market') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {expandedMenus.includes('market') && (
              <div className="ml-4 mt-1 space-y-1">
                <a href="/admin/market" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/market') ? 'bg-primary' : 'hover:bg-slate-800'}`}>行情查看</a>
                <a href="/admin/market/stocks" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/market/stocks') ? 'bg-primary' : 'hover:bg-slate-800'}`}>股票池管理</a>
                <a href="/admin/market/anomalies" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/market/anomalies') ? 'bg-primary' : 'hover:bg-slate-800'}`}>异常标记</a>
              </div>
            )}
          </div>

          {/* 系统管理 */}
          <div>
            <button onClick={() => toggleMenu('system')} className="w-full flex items-center justify-between py-2 px-4 rounded hover:bg-slate-800">
              <span>⚙️ 系统管理</span>
              {expandedMenus.includes('system') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {expandedMenus.includes('system') && (
              <div className="ml-4 mt-1 space-y-1">
                <a href="/admin/system/params" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/system/params') ? 'bg-primary' : 'hover:bg-slate-800'}`}>系统参数</a>
                <a href="/admin/system/admins" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/system/admins') ? 'bg-primary' : 'hover:bg-slate-800'}`}>管理员管理</a>
                <a href="/admin/system/audit" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/system/audit') ? 'bg-primary' : 'hover:bg-slate-800'}`}>审计日志</a>
                <a href="/admin/system/audit-advanced" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/system/audit-advanced') ? 'bg-primary' : 'hover:bg-slate-800'}`}>高级筛选</a>
                <a href="/admin/system/logs" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/system/logs') ? 'bg-primary' : 'hover:bg-slate-800'}`}>运行日志</a>
                <a href="/admin/system/backup" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/system/backup') ? 'bg-primary' : 'hover:bg-slate-800'}`}>数据备份</a>
              </div>
            )}
          </div>

          {/* 风控管理 */}
          <div>
            <button onClick={() => toggleMenu('risk')} className="w-full flex items-center justify-between py-2 px-4 rounded hover:bg-slate-800">
              <span>🛡️ 风控管理</span>
              {expandedMenus.includes('risk') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {expandedMenus.includes('risk') && (
              <div className="ml-4 mt-1 space-y-1">
                <a href="/admin/risk/rules" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/risk/rules') ? 'bg-primary' : 'hover:bg-slate-800'}`}>风控规则</a>
                <a href="/admin/risk/alerts" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/risk/alerts') ? 'bg-primary' : 'hover:bg-slate-800'}`}>风险预警</a>
              </div>
            )}
          </div>

          {/* 数据报表 */}
          <div>
            <button onClick={() => toggleMenu('reports')} className="w-full flex items-center justify-between py-2 px-4 rounded hover:bg-slate-800">
              <span>📈 数据报表</span>
              {expandedMenus.includes('reports') ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {expandedMenus.includes('reports') && (
              <div className="ml-4 mt-1 space-y-1">
                <a href="/admin/reports/trade" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/reports/trade') ? 'bg-primary' : 'hover:bg-slate-800'}`}>交易报表</a>
                <a href="/admin/reports/user" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/reports/user') ? 'bg-primary' : 'hover:bg-slate-800'}`}>用户报表</a>
                <a href="/admin/reports/market" className={`block py-1.5 px-4 rounded text-sm ${isActive('/admin/reports/market') ? 'bg-primary' : 'hover:bg-slate-800'}`}>行情报表</a>
              </div>
            )}
          </div>
        </nav>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 py-2 px-4 rounded bg-red-600 hover:bg-red-700 transition mt-4"
        >
          <LogOut className="w-4 h-4" />
          退出登录
        </button>
      </aside>
      <main className="flex-1 overflow-auto p-8 bg-slate-50">{children}</main>
    </div>
  );
}
