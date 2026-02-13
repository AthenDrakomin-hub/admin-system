export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <h2 className="text-3xl font-bold text-center">管理员登录</h2>
        <form className="mt-8 space-y-6">
          <input type="text" placeholder="用户名" className="w-full px-3 py-2 border rounded" />
          <input type="password" placeholder="密码" className="w-full px-3 py-2 border rounded" />
          <button type="submit" className="w-full py-2 px-4 bg-primary text-white rounded">
            登录
          </button>
        </form>
      </div>
    </div>
  );
}
