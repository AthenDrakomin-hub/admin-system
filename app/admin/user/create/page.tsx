'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { createUser } from '@/app/actions/adminActions';
import { CreateUserRequest } from '@/types/admin';

// 主色：银河蓝 #0052D9
const PRIMARY_COLOR = 'bg-[#0052D9] hover:bg-[#0047b9] focus:ring-[#0052D9]';

export default function CreateUserPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 表单状态（默认初始密码123456，默认status:active）
  const [formData, setFormData] = useState<CreateUserRequest>({
    username: '',
    password: '123456',
    real_name: '',
    phone: '',
    email: '',
    status: 'active',
  });

  // 表单变更处理
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null); // 输入时清空错误
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // 前端基础校验
    if (!formData.username || !formData.password || !formData.real_name || !formData.phone) {
      setError('用户名、密码、真实姓名、手机号不能为空');
      setIsLoading(false);
      return;
    }

    // 手机号格式校验
    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      setError('请输入正确的手机号码');
      setIsLoading(false);
      return;
    }

    // 密码长度校验
    if (formData.password.length < 6) {
      setError('密码长度至少6位');
      setIsLoading(false);
      return;
    }

    // 调用Server Action
    const result = await createUser(formData);
    
    setIsLoading(false);
    if (result.success) {
      alert(`用户 ${formData.username} 创建成功！初始密码：${formData.password}`);
      router.push('/admin/user/list'); // 跳转到用户列表
      router.refresh(); // 刷新页面
    } else {
      setError(result.error || '创建用户失败');
    }
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
        <h1 className="text-2xl font-bold">新建客户</h1>
        <p className="text-slate-600 mt-1">创建新的客户端用户账号</p>
      </div>

      <div className="bg-white rounded-xl shadow border p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 用户名输入框 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              用户名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0052D9] focus:border-[#0052D9]"
              placeholder="请输入用户名"
              required
            />
            <p className="text-xs text-slate-500 mt-1">用户登录时使用的唯一标识</p>
          </div>

          {/* 初始密码输入框（带显隐切换） */}
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              初始密码 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0052D9] focus:border-[#0052D9] pr-10"
                placeholder="请输入初始密码"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#0052D9]"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">建议使用强密码，长度至少6位</p>
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
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0052D9] focus:border-[#0052D9]"
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
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0052D9] focus:border-[#0052D9]"
              placeholder="请输入手机号"
              required
            />
          </div>

          {/* 邮箱（可选） */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              邮箱（可选）
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0052D9] focus:border-[#0052D9]"
              placeholder="请输入邮箱地址"
            />
          </div>

          {/* 用户状态 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              用户状态
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#0052D9] focus:border-[#0052D9]"
              aria-label="选择用户状态"
            >
              <option value="active">启用（可登录）</option>
              <option value="pending">待审核</option>
              <option value="disabled">禁用</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              {formData.status === 'active' && '用户创建后可直接登录'}
              {formData.status === 'pending' && '用户需要管理员审核后才能登录'}
              {formData.status === 'disabled' && '用户账户被禁用，无法登录'}
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* 提交按钮 */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              disabled={isLoading}
            >
              取消
            </button>
            <button
              type="submit"
              className={`px-6 py-2 ${PRIMARY_COLOR} text-white rounded-lg flex items-center gap-2`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  创建中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  新建客户
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl">
        <h3 className="font-medium text-blue-900 mb-2">注意事项</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 用户名必须唯一，不能与现有用户重复</li>
          <li>• 手机号必须符合中国大陆手机号格式（1开头，11位数字）</li>
          <li>• 密码会被加密存储，无法找回原密码</li>
          <li>• 创建成功后用户初始余额为0</li>
          <li>• 选择"启用"状态用户可直接登录，"待审核"状态需要管理员审核</li>
        </ul>
      </div>
    </div>
  );
}