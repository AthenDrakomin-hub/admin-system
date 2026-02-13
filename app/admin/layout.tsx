export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-gray-800 text-white p-4">
        <h1 className="text-xl font-bold mb-8">ZY投资管理</h1>
        <nav className="space-y-2">
          <a href="/admin/dashboard" className="block py-2 px-4 rounded hover:bg-gray-700">工作台</a>
          <a href="/admin/trade/a-share" className="block py-2 px-4 rounded hover:bg-gray-700">交易审核</a>
          <a href="/admin/user/list" className="block py-2 px-4 rounded hover:bg-gray-700">用户管理</a>
          <a href="/admin/finance/recharge" className="block py-2 px-4 rounded hover:bg-gray-700">财务审核</a>
          <a href="/admin/system/params" className="block py-2 px-4 rounded hover:bg-gray-700">系统配置</a>
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
