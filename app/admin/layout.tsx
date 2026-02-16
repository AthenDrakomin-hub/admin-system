import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyAdminAuth } from '@/lib/auth';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Settings,
  BarChart3,
  FileText,
  LogOut,
  ChevronRight,
  Shield,
  TrendingUp,
  DollarSign,
  Building,
  Bell
} from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const token = cookieStore.get('admin_token')?.value;
  
  if (!token) {
    console.log('AdminLayout: No admin_token cookie found');
    redirect('/login');
  }

  const admin = await verifyAdminAuth(token);
  if (!admin) {
    console.log('AdminLayout: Token verification failed');
    redirect('/login');
  }

  console.log('AdminLayout: User authenticated as', admin.username, 'role:', admin.role);

  const menuItems = [
    {
      title: '工作台',
      icon: <LayoutDashboard className="w-5 h-5" />,
      href: '/admin/dashboard',
      active: true
    },
    {
      title: '交易审核',
      icon: <FileText className="w-5 h-5" />,
      href: '#',
      children: [
        { title: 'A股交易', href: '/admin/trade/a-share' },
        { title: '港股交易', href: '/admin/trade/hk-share' },
        { title: '新股申购', href: '/admin/trade/ipo' },
        { title: '大宗交易', href: '/admin/trade/block' },
        { title: '一键打板', href: '/admin/trade/board' },
        { title: '异常订单', href: '/admin/trade/abnormal' },
        { title: '交易日志', href: '/admin/trade/logs' },
      ]
    },
    {
      title: '用户管理',
      icon: <Users className="w-5 h-5" />,
      href: '#',
      children: [
        { title: '用户列表', href: '/admin/user/list' },
        { title: '创建用户', href: '/admin/user/create' },
        { title: '资金上下分', href: '/admin/user/funds' },
        { title: '持仓管理', href: '/admin/user/positions' },
        { title: '订单管控', href: '/admin/user/orders' },
        { title: '流水管控', href: '/admin/user/flows' },
        { title: '用户状态', href: '/admin/user/status' },
        { title: '站内信', href: '/admin/user/messages' },
      ]
    },
    {
      title: '财务审核',
      icon: <CreditCard className="w-5 h-5" />,
      href: '#',
      children: [
        { title: '充值审核', href: '/admin/finance/recharge' },
        { title: '提现审核', href: '/admin/finance/withdraw' },
        { title: '对账管理', href: '/admin/finance/reconciliation' },
        { title: '财务报表', href: '/admin/finance/reports' },
      ]
    },
    {
      title: '行情管理',
      icon: <TrendingUp className="w-5 h-5" />,
      href: '#',
      children: [
        { title: '行情监控', href: '/admin/market' },
        { title: '股票管理', href: '/admin/market/stocks' },
        { title: '异常监控', href: '/admin/market/anomalies' },
      ]
    },
    {
      title: '风控管理',
      icon: <Shield className="w-5 h-5" />,
      href: '#',
      children: [
        { title: '风险告警', href: '/admin/risk/alerts' },
        { title: '规则配置', href: '/admin/risk/rules' },
      ]
    },
    {
      title: '报表中心',
      icon: <BarChart3 className="w-5 h-5" />,
      href: '#',
      children: [
        { title: '用户报表', href: '/admin/reports/user' },
        { title: '交易报表', href: '/admin/reports/trade' },
        { title: '行情报表', href: '/admin/reports/market' },
      ]
    },
    {
      title: '系统配置',
      icon: <Settings className="w-5 h-5" />,
      href: '#',
      children: [
        { title: '参数配置', href: '/admin/system/params' },
        { title: '管理员管理', href: '/admin/system/admins' },
        { title: '审计日志', href: '/admin/system/audit' },
        { title: '高级审计', href: '/admin/system/audit-advanced' },
        { title: '系统日志', href: '/admin/system/logs' },
        { title: '数据备份', href: '/admin/system/backup' },
      ]
    },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* 侧边栏 */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Building className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">证裕投资</h1>
              <p className="text-xs text-slate-500">交易单元管理系统</p>
            </div>
          </div>
        </div>

        {/* 用户信息 */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-900">{admin.username}</p>
              <p className="text-xs text-slate-500">
                {admin.role === 'super_admin' ? '超级管理员' : '管理员'}
              </p>
            </div>
            <Bell className="w-5 h-5 text-slate-400" />
          </div>
        </div>

        {/* 导航菜单 */}
        <div className="flex-1 overflow-y-auto p-4">
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <div key={item.title} className="mb-2">
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition"
                >
                  {item.icon}
                  <span className="flex-1 font-medium">{item.title}</span>
                  {item.children && <ChevronRight className="w-4 h-4" />}
                </Link>
                
                {/* 子菜单 */}
                {item.children && (
                  <div className="ml-10 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Link
                        key={child.title}
                        href={child.href}
                        className="block px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                      >
                        {child.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* 退出登录 */}
        <div className="p-4 border-t border-slate-200">
          <a
            href="/api/auth/logout"
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-slate-700 hover:bg-red-50 hover:text-red-600 transition"
          >
            <LogOut className="w-5 h-5" />
            <span className="flex-1 font-medium text-left">退出登录</span>
          </a>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
