"use client";

import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Clock, RefreshCw, AlertCircle } from "lucide-react";
import { checkTradePermission } from "@/types/admin";

interface TradeItem {
  id: string;
  user_id: string;
  symbol?: string;
  symbol_name?: string;
  side?: 'buy' | 'sell';
  quantity?: number;
  trade_data?: any;
  created_at: string;
  users?: {
    username: string;
    real_name: string;
    phone?: string;
  };
  // 其他交易类型可能有的字段
  ipo_code?: string;
  ipo_name?: string;
  apply_quantity?: number;
  apply_amount?: number;
  block_size?: number;
  block_price?: number;
  strategy_name?: string;
  condition_type?: string;
  trigger_price?: number;
}

interface TradeAuditProps {
  tradeType: 'a_share' | 'hk_share' | 'block' | 'ipo' | 'board' | 'conditional' | 'abnormal';
  title: string;
  icon: React.ReactNode;
  adminPermissions?: any;
}

export default function TradeAudit({ tradeType, title, icon, adminPermissions }: TradeAuditProps) {
  const [trades, setTrades] = useState<TradeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 检查权限
  const hasPermission = adminPermissions ? checkTradePermission(adminPermissions, tradeType) : true;

  const fetchTrades = async () => {
    if (!hasPermission) {
      setError("无此交易类型的审核权限");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // 获取管理员token
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setError("管理员未登录");
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/admin/trade?type=${tradeType}&status=pending`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      
      if (data.success) {
        setTrades(data.data || []);
      } else {
        setError(data.error || "获取交易记录失败");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "网络请求失败");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'approve' | 'reject' | 'cancel', targetId: string) => {
    if (!hasPermission) {
      alert("无此交易类型的审核权限");
      return;
    }

    if (action === 'approve' && !confirm('确定批准？')) return;
    
    let reason = '';
    if (action === 'reject' || action === 'cancel') {
      reason = prompt(`${action === 'reject' ? '驳回' : '取消'}原因：`) || '';
      if (!reason) return;
    }

    try {
      setProcessingId(targetId);
      
      const token = localStorage.getItem('adminToken');
      const adminId = localStorage.getItem('adminId');
      const adminName = localStorage.getItem('adminName');
      
      if (!token || !adminId || !adminName) {
        alert("管理员信息不完整，请重新登录");
        return;
      }

      // 确定目标类型
      let targetType = 'order';
      if (tradeType === 'block') targetType = 'block_order';
      else if (tradeType === 'ipo') targetType = 'ipo_application';
      else if (tradeType === 'board') targetType = 'board_strategy';
      else if (tradeType === 'conditional') targetType = 'conditional_order';
      // abnormal类型也使用'order'，因为异常订单存储在orders表中
      
      const res = await fetch('/api/admin/trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          targetType,
          targetId,
          reason,
          adminId,
          adminName
        }),
      });
      
      const data = await res.json();
      if (data.success) {
        alert(`操作成功：${action === 'approve' ? '批准' : action === 'reject' ? '驳回' : '取消'}`);
        fetchTrades();
      } else {
        alert(`操作失败: ${data.error}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(`操作失败: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, [tradeType, hasPermission]);

  // 渲染交易项内容
  const renderTradeContent = (trade: TradeItem) => {
    switch (tradeType) {
      case 'a_share':
      case 'hk_share':
        const tradeData = typeof trade.trade_data === 'string' ? JSON.parse(trade.trade_data) : trade.trade_data;
        const price = tradeData?.price || 0;
        const amount = tradeData?.amount || (price * (trade.quantity || 0));
        return (
          <>
            <td className="py-3 px-4">
              <div className="font-medium">{trade.symbol || 'N/A'}</div>
              <div className="text-xs text-slate-500">{trade.symbol_name || ''}</div>
            </td>
            <td className="py-3 px-4">
              <span className={`px-2 py-1 rounded text-xs ${trade.side === 'buy' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {trade.side === 'buy' ? '买入' : trade.side === 'sell' ? '卖出' : 'N/A'}
              </span>
            </td>
            <td className="py-3 px-4 text-right">{price.toFixed(2)}</td>
            <td className="py-3 px-4 text-right">{trade.quantity || 0}</td>
            <td className="py-3 px-4 text-right font-bold">{amount.toLocaleString()}</td>
          </>
        );
      
      case 'block':
        return (
          <>
            <td className="py-3 px-4">
              <div className="font-medium">{trade.symbol || 'N/A'}</div>
              <div className="text-xs text-slate-500">大宗交易</div>
            </td>
            <td className="py-3 px-4">-</td>
            <td className="py-3 px-4 text-right">{trade.block_price?.toFixed(2) || '0.00'}</td>
            <td className="py-3 px-4 text-right">{trade.block_size?.toLocaleString() || '0'}</td>
            <td className="py-3 px-4 text-right font-bold">
              {((trade.block_price || 0) * (trade.block_size || 0)).toLocaleString()}
            </td>
          </>
        );
      
      case 'ipo':
        return (
          <>
            <td className="py-3 px-4">
              <div className="font-medium">{trade.ipo_code || 'N/A'}</div>
              <div className="text-xs text-slate-500">{trade.ipo_name || ''}</div>
            </td>
            <td className="py-3 px-4">申购</td>
            <td className="py-3 px-4 text-right">-</td>
            <td className="py-3 px-4 text-right">{trade.apply_quantity?.toLocaleString() || '0'}</td>
            <td className="py-3 px-4 text-right font-bold">{trade.apply_amount?.toLocaleString() || '0'}</td>
          </>
        );
      
      case 'board':
        return (
          <>
            <td className="py-3 px-4">
              <div className="font-medium">{trade.symbol || 'N/A'}</div>
              <div className="text-xs text-slate-500">{trade.strategy_name || '一键打板'}</div>
            </td>
            <td className="py-3 px-4">打板</td>
            <td className="py-3 px-4 text-right">-</td>
            <td className="py-3 px-4 text-right">{trade.quantity?.toLocaleString() || '0'}</td>
            <td className="py-3 px-4 text-right font-bold">-</td>
          </>
        );
      
      case 'conditional':
        return (
          <>
            <td className="py-3 px-4">
              <div className="font-medium">{trade.symbol || 'N/A'}</div>
              <div className="text-xs text-slate-500">{trade.condition_type || '条件单'}</div>
            </td>
            <td className="py-3 px-4">条件触发</td>
            <td className="py-3 px-4 text-right">{trade.trigger_price?.toFixed(2) || '0.00'}</td>
            <td className="py-3 px-4 text-right">{trade.quantity?.toLocaleString() || '0'}</td>
            <td className="py-3 px-4 text-right font-bold">-</td>
          </>
        );
      
      case 'abnormal':
        // 异常订单显示，添加异常标记
        const abnormalTradeData = typeof trade.trade_data === 'string' ? JSON.parse(trade.trade_data) : trade.trade_data;
        const abnormalPrice = abnormalTradeData?.price || 0;
        const abnormalAmount = abnormalTradeData?.amount || (abnormalPrice * (trade.quantity || 0));
        return (
          <>
            <td className="py-3 px-4">
              <div className="font-medium">{trade.symbol || 'N/A'}</div>
              <div className="text-xs text-slate-500">{trade.symbol_name || ''}</div>
              <div className="text-xs text-red-600 font-semibold mt-1">⚠️ 异常订单</div>
            </td>
            <td className="py-3 px-4">
              <span className={`px-2 py-1 rounded text-xs ${trade.side === 'buy' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {trade.side === 'buy' ? '买入' : trade.side === 'sell' ? '卖出' : 'N/A'}
              </span>
            </td>
            <td className="py-3 px-4 text-right">{abnormalPrice.toFixed(2)}</td>
            <td className="py-3 px-4 text-right">{trade.quantity || 0}</td>
            <td className="py-3 px-4 text-right font-bold">{abnormalAmount.toLocaleString()}</td>
          </>
        );
      
      default:
        return (
          <>
            <td className="py-3 px-4">-</td>
            <td className="py-3 px-4">-</td>
            <td className="py-3 px-4 text-right">-</td>
            <td className="py-3 px-4 text-right">-</td>
            <td className="py-3 px-4 text-right">-</td>
          </>
        );
    }
  };

  // 渲染表格列头
  const renderTableHeaders = () => {
    const headers = [
      { label: '用户', className: 'text-left' },
      { label: tradeType === 'ipo' ? '新股' : '股票', className: 'text-left' },
      { label: '方向', className: 'text-left' },
      { label: '价格', className: 'text-right' },
      { label: '数量', className: 'text-right' },
      { label: '金额', className: 'text-right' },
      { label: '操作', className: 'text-center' },
    ];
    
    return headers.map((header, index) => (
      <th key={index} className={`py-3 px-4 text-sm font-semibold ${header.className}`}>
        {header.label}
      </th>
    ));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {icon}
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={fetchTrades} 
            disabled={loading || !hasPermission} 
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
            待审核: {trades.length}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {!hasPermission && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
          您没有{title}的审核权限，请联系管理员
        </div>
      )}

      <div className="bg-white rounded-xl shadow border">
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              {renderTableHeaders()}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  加载中...
                </td>
              </tr>
            ) : trades.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p>暂无待审核记录</p>
                </td>
              </tr>
            ) : (
              trades.map((trade) => (
                <tr key={trade.id} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="font-medium">{trade.users?.real_name || '未知用户'}</div>
                    <div className="text-xs text-slate-500">{trade.users?.username || trade.user_id?.substring(0, 8)}</div>
                  </td>
                  {renderTradeContent(trade)}
                  <td className="py-3 px-4">
                    <div className="flex gap-2 justify-center">
                      <button 
                        onClick={() => handleAction('approve', trade.id)} 
                        disabled={processingId === trade.id || !hasPermission}
                        className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4 inline mr-1" />批准
                      </button>
                      <button 
                        onClick={() => handleAction('reject', trade.id)} 
                        disabled={processingId === trade.id || !hasPermission}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4 inline mr-1" />驳回
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
  );
}
