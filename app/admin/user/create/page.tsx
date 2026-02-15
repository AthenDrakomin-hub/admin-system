"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ArrowLeft } from "lucide-react";
import { adminApi } from "@/lib/admin-api";

export default function CreateUserPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: "",
    real_name: "",
    phone: "",
    email: "",
    password: "",
    id_card: "",
    organization_id: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 验证必填字段
      if (!formData.username || !formData.real_name || !formData.phone || !formData.password) {
        setError("请填写所有必填字段");
        setLoading(false);
        return;
      }

      // 验证手机号格式
      if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
        setError("请输入正确的手机号码");
        setLoading(false);
        return;
      }

      // 验证邮箱格式（如果填写）
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setError("请输入正确的邮箱地址");
        setLoading(false);
        return;
      }

      // 验证身份证格式（如果填写）
      if (formData.id_card && !/(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/.test(formData.id_card)) {
        setError("请输入正确的身份证号码");
        setLoading(false);
        return;
      }

      // 密码强度验证
      if (formData.password.length < 6) {
        setError("密码长度至少6位");
        setLoading(false);
        return;
      }

      // 准备用户数据
      const userData = {
        username: formData.username.trim(),
        real_name: formData.real_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        id_card: formData.id_card.trim() || null,
        organization_id: formData.organization_id || null,
        status: "pending", // 默认待审核状态
        auth_status: "pending", // 默认待实名认证
      };

      // 调用API创建用户
      const result = await adminApi.users.create(userData);

      if (result.success || result.data) {
        alert("用户创建成功！");
        router.push('/admin/user/list');
      } else {
        setError(result.error || "创建用户失败");
      }
    } catch (err) {
      console.error("创建用户错误:", err);
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          返回用户列表
        </button>
        <h1 className="text-2xl font-bold">新建用户账号</h1>
        <p className="text-slate-600 mt-1">创建新的客户端用户账号</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow border p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 用户名 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                用户名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="请输入用户名"
                required
              />
              <p className="text-xs text-slate-500 mt-1">用户登录时使用的唯一标识</p>
            </div>

            {/* 真实姓名 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                真实姓名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="real_name"
                value={formData.real_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="请输入真实姓名"
                required
              />
            </div>

            {/* 手机号 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                手机号 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="请输入手机号"
                required
              />
            </div>

            {/* 邮箱 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                邮箱
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="请输入邮箱地址"
              />
            </div>

            {/* 身份证号 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                身份证号
              </label>
              <input
                type="text"
                name="id_card"
                value={formData.id_card}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="请输入身份证号"
              />
            </div>

            {/* 密码 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                登录密码 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="请输入登录密码"
                required
              />
              <p className="text-xs text-slate-500 mt-1">密码长度至少6位</p>
            </div>

            {/* 机构ID */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                所属机构ID
              </label>
              <input
                type="text"
                name="organization_id"
                value={formData.organization_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="请输入机构ID（可选）"
              />
              <p className="text-xs text-slate-500 mt-1">如果不填写则为个人用户</p>
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              disabled={loading}
            >
              取消
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  创建中...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  创建用户
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 注意事项 */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl">
        <h3 className="font-medium text-blue-900 mb-2">注意事项</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 新创建的用户默认状态为"待审核"，需要在审核中心通过后才能正常使用</li>
          <li>• 用户名必须唯一，不能与现有用户重复</li>
          <li>• 手机号必须符合中国大陆手机号格式</li>
          <li>• 密码会被加密存储，无法找回原密码</li>
          <li>• 创建成功后用户初始余额为0</li>
        </ul>
      </div>
    </div>
  );
}