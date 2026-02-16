"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, User, CreditCard, RefreshCw } from "lucide-react";
import { ApiResponse, FinanceStatus } from "@/types/api";

interface RechargeRequest {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: FinanceStatus;
  created_at: string;
  payment_method?: string;
  transaction_id?: string;
  users?: {
    username: string;
    real_name: string;
  };
}

export default function RechargeAuditPage() {
  const [requests, setRequests] = useState<RechargeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPendingRecharges = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/finance?type=recharge&page=1&limit=50');
      const data: ApiResponse = await res.json();
      
      if (data.success) {
        // 处理不同的数据格式：data.data 可能是数组或 {requests: array}
        const responseData = data.data;
        if (Array.isArray(responseData)) {
          setRequests(responseData);
        } else if (responseData && responseData.requests && Array.isArray(responseData.requests)) {
          setRequests(responseData.requests);
        } else {
          // 如果数据格式不符合预期，设置为空数组
          console.warn('API返回的数据格式不符合预期:', responseData);
          setRequests([]);
        }
      } else {
        setError(data.error || '获取数据失败');
      }
    } catch (err) {
      setError('网络请求失败');
      console.error('Failed to fetch pending recharges:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    if (!confirm('确定要批准此充值申请吗？')) return;
    
    try {
      setProcessingId(requestId);
      const adminId = localStorage.getItem('adminId') || '';
      const adminName = localStorage.getItem('adminName') || '';
      
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'recharge',
          requestId,
          action: 'approve',
          adminId,
          adminName,
          reason: '审核通过'
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert('审核通过成功');
        fetchPendingRecharges(); // 刷新列表
      } else {
        alert(`审核失败: ${data.error}`);
      }
    } catch (err) {
      alert('网络请求失败');
      console.error('Failed to approve recharge:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    const reason = prompt('请输入驳回原因：');
    if (!reason) return;
    
    try {
      setProcessingId(requestId);
      const adminId = localStorage.getItem('adminId') || '';
      const adminName = localStorage.getItem('adminName') || '';
      
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'recharge',
          requestId,
          action: 'reject',
          adminId,
          adminName,
          reason
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert('驳回成功');
        fetchPendingRecharges(); // 刷新列表
      } else {
        alert(`驳回失败: ${data.error}`);
      }
    } catch (err) {
      alert('网络请求失败');
      console.error('Failed to reject recharge:', err);
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    fetchPendingRecharges();
  }, []);

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">充值审核</h1>
          <p className="text-slate-500 text-sm">审核用户充值申请，确保资金安全</p>
        </div>
        <button
          onClick={fetchPendingRecharges}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">申请时间</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">用户信息</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">充值金额</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">支付方式</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">交易号</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">状态</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                      <p className="text-slate-500">加载中...</p>
                    </div>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Clock className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-slate-500">暂无待审核的充值申请</p>
                    </div>
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="text-sm text-slate-700">{formatTime(request.created_at)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-400" />
                        <div>
                          <div className="font-medium">{request.users?.real_name || '未知用户'}</div>
                          <div className="text-xs text-slate-500">{request.users?.username || request.user_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-green-500" />
                        <div>
                          <div className="font-bold text-slate-900">
                            {request.amount.toLocaleString()} {request.currency || 'CNY'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-slate-700">{request.payment_method || '未知'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-slate-700 font-mono">{request.transaction_id || '无'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <Clock className="w-3 h-3 mr-1" />
                        待审核
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApprove(request.id)}
                          disabled={processingId === request.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {processingId === request.id ? '处理中...' : '批准'}
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={processingId === request.id}
                          className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          {processingId === request.id ? '处理中...' : '驳回'}
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
    </div>
  );
}