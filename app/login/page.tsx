"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Lock, User, Eye, EyeOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      console.log('开始登录...', { username });
      
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      console.log('响应状态:', res.status);
      const data = await res.json();
      console.log('完整响应数据:', data);

      if (!res.ok) {
        setError(data.error || "登录失败");
        setLoading(false);
        return;
      }

      // 核心修复：匹配后端返回的数据结构
      // 后端返回格式: { success: true, data: { token: "...", user: { id, username, role } } }
      if (!data.success) {
        setError(data.error || "登录失败");
        setLoading(false);
        return;
      }

      // 使用可选链操作符避免undefined错误
      const token = data.data?.token;
      const user = data.data?.user;
      
      if (!token || !user) {
        console.error('响应数据不完整:', { token, user });
        setError("登录响应数据不完整");
        setLoading(false);
        return;
      }

      // 存储token和用户信息
      const expires = new Date();
      expires.setDate(expires.getDate() + 7);
      document.cookie = `admin_token=${token}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
      localStorage.setItem("token", token);
      localStorage.setItem("adminId", user.id); // 保存adminId
      localStorage.setItem("adminName", user.username); // 保存adminName
      localStorage.setItem("adminRole", user.role); // 保存角色
      
      console.log('登录成功，用户信息:', user);
      console.log('Cookie已设置:', document.cookie);
      window.location.href = '/admin/dashboard';
    } catch (err) {
      console.error('登录错误:', err);
      setError("网络错误，请稍后重试");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary-500 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-400 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-white rounded-2xl p-3">
            <img 
              src="https://zlbemopcgjohrnyyiwvs.supabase.co/storage/v1/object/public/ZY/logologo-removebg-preview.png" 
              alt="银河证券" 
              className="h-16 w-auto"
            />
          </div>
        </div>

        {/* Login form */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-6 text-center">
            管理系统验证中心
          </h2>

          <div className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                用户名
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                  placeholder="请输入用户名"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                密码
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                  placeholder="请输入密码"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className={cn(
                "w-full py-3 rounded-lg font-medium text-white transition-all",
                "bg-primary hover:bg-primary-600 active:bg-primary-700",
                "focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "flex items-center justify-center gap-2"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  登录中...
                </>
              ) : (
                "登录"
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          © 2026 中国银河证券 - 证裕投资交易单元
        </p>
      </div>
    </div>
  );
}
