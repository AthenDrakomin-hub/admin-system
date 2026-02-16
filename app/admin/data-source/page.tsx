'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Save, Plus, Trash2 } from 'lucide-react';

interface DataSourceConfig {
  id?: string;
  market_type: 'CN' | 'HK';
  provider: 'YAHOO_FINANCE' | 'ALPHA_VANTAGE';
  api_key?: string;
  cache_ttl: number;
  is_active: boolean;
}

interface AllowedStock {
  id?: string;
  symbol: string;
  market_type: 'CN' | 'HK';
  display_name?: string;
}

export default function DataSourceConfigPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [configs, setConfigs] = useState<DataSourceConfig[]>([]);
  const [allowedStocks, setAllowedStocks] = useState<AllowedStock[]>([]);
  const [activeConfig, setActiveConfig] = useState<DataSourceConfig | null>(null);
  const [newStock, setNewStock] = useState({ symbol: '', market_type: 'CN' as 'CN' | 'HK', display_name: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchConfigs();
    fetchAllowedStocks();
  }, []);

  const fetchConfigs = async () => {
    const { data } = await supabase.from('data_source_configs').select('*').order('market_type');
    setConfigs(data || []);
  };

  const fetchAllowedStocks = async () => {
    const { data } = await supabase.from('allowed_stocks').select('*').order('market_type, symbol');
    setAllowedStocks(data || []);
  };

  const saveConfig = async () => {
    if (!activeConfig) return;
    
    setLoading(true);
    try {
      if (activeConfig.id) {
        await supabase.from('data_source_configs').update(activeConfig).eq('id', activeConfig.id);
      } else {
        await supabase.from('data_source_configs').insert(activeConfig);
      }
      fetchConfigs();
      setActiveConfig(null);
    } catch (error) {
      console.error('保存配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteConfig = async (id: string) => {
    if (!confirm('确定要删除此配置吗？')) return;
    
    setLoading(true);
    try {
      await supabase.from('data_source_configs').delete().eq('id', id);
      fetchConfigs();
    } catch (error) {
      console.error('删除配置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const addAllowedStock = async () => {
    if (!newStock.symbol.trim()) {
      alert('请输入股票代码');
      return;
    }
    
    setLoading(true);
    try {
      await supabase.from('allowed_stocks').insert({
        symbol: newStock.symbol.trim(),
        market_type: newStock.market_type,
        display_name: newStock.display_name.trim() || null
      });
      fetchAllowedStocks();
      setNewStock({ symbol: '', market_type: 'CN', display_name: '' });
    } catch (error) {
      console.error('添加股票失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteAllowedStock = async (id: string) => {
    if (!confirm('确定要删除此股票吗？')) return;
    
    setLoading(true);
    try {
      await supabase.from('allowed_stocks').delete().eq('id', id);
      fetchAllowedStocks();
    } catch (error) {
      console.error('删除股票失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMarketName = (market: 'CN' | 'HK') => {
    return market === 'CN' ? 'A股' : '港股';
  };

  const getProviderName = (provider: 'YAHOO_FINANCE' | 'ALPHA_VANTAGE') => {
    return provider === 'YAHOO_FINANCE' ? 'Yahoo Finance（免费）' : 'Alpha Vantage（付费）';
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">数据源配置管理</h1>
      
      {/* 数据源配置模块 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">数据源配置</h2>
          <button
            onClick={() => setActiveConfig({ market_type: 'CN', provider: 'YAHOO_FINANCE', cache_ttl: 120, is_active: true })}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
          >
            <Plus className="w-4 h-4" />
            新增配置
          </button>
        </div>

        {activeConfig && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h3 className="text-lg font-medium mb-4">{activeConfig.id ? '编辑配置' : '新增配置'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="market_type" className="block text-sm font-medium mb-1">市场类型</label>
                <select
                  id="market_type"
                  value={activeConfig.market_type}
                  onChange={(e) => setActiveConfig({ ...activeConfig, market_type: e.target.value as 'CN' | 'HK' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500/50"
                  aria-label="选择市场类型"
                  title="选择股票市场类型：A股或港股"
                >
                  <option value="CN">A股</option>
                  <option value="HK">港股</option>
                </select>
              </div>
              <div>
                <label htmlFor="provider" className="block text-sm font-medium mb-1">数据源提供商</label>
                <select
                  id="provider"
                  value={activeConfig.provider}
                  onChange={(e) => setActiveConfig({ ...activeConfig, provider: e.target.value as 'YAHOO_FINANCE' | 'ALPHA_VANTAGE' })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500/50"
                  aria-label="选择数据源提供商"
                  title="选择数据源提供商：免费Yahoo Finance或付费Alpha Vantage"
                >
                  <option value="YAHOO_FINANCE">Yahoo Finance（免费，无需API密钥）</option>
                  <option value="ALPHA_VANTAGE">Alpha Vantage（付费，需要API密钥）</option>
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  {activeConfig.provider === 'YAHOO_FINANCE' 
                    ? '免费数据源，无需API密钥即可使用'
                    : '付费数据源，需要从Alpha Vantage官网获取API密钥'}
                </p>
              </div>
              {activeConfig.provider === 'ALPHA_VANTAGE' && (
                <div>
                  <label htmlFor="api_key" className="block text-sm font-medium mb-1">API密钥（必需）</label>
                  <input
                    id="api_key"
                    type="password"
                    value={activeConfig.api_key || ''}
                    onChange={(e) => setActiveConfig({ ...activeConfig, api_key: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500/50"
                    placeholder="输入Alpha Vantage API密钥"
                    title="输入Alpha Vantage API密钥，从官网获取"
                    required={activeConfig.provider === 'ALPHA_VANTAGE'}
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    从 <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Alpha Vantage官网</a> 获取API密钥
                  </p>
                </div>
              )}
              <div>
                <label htmlFor="cache_ttl" className="block text-sm font-medium mb-1">缓存时间（秒）</label>
                <input
                  id="cache_ttl"
                  type="number"
                  value={activeConfig.cache_ttl}
                  onChange={(e) => setActiveConfig({ ...activeConfig, cache_ttl: parseInt(e.target.value) || 120 })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500/50"
                  placeholder="输入缓存时间，单位：秒"
                  title="数据缓存时间，单位：秒，建议值：60-3600"
                  min="60"
                  step="60"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={activeConfig.is_active}
                  onChange={(e) => setActiveConfig({ ...activeConfig, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  title="启用或禁用此数据源配置"
                />
                <label htmlFor="is_active" className="ml-2 text-sm">启用此配置</label>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveConfig}
                disabled={loading}
                className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                保存
              </button>
              <button
                onClick={() => setActiveConfig(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300"
              >
                取消
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">市场</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">提供商</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">缓存时间</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">状态</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">操作</th>
                </tr>
              </thead>
              <tbody>
                {configs.map(cfg => (
                  <tr key={cfg.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="text-sm text-slate-700">{getMarketName(cfg.market_type)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-slate-700">{getProviderName(cfg.provider)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-slate-700">{cfg.cache_ttl}秒</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {cfg.is_active ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setActiveConfig(cfg)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => cfg.id && deleteConfig(cfg.id)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {configs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      暂无数据源配置，点击"新增配置"添加
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 允许的股票白名单模块 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">允许访问的股票白名单</h2>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h3 className="text-lg font-medium mb-4">添加股票</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="stock_symbol" className="block text-sm font-medium mb-1">股票代码</label>
              <input
                id="stock_symbol"
                type="text"
                value={newStock.symbol}
                onChange={(e) => setNewStock({ ...newStock, symbol: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500/50"
                placeholder="例如：AAPL"
                title="输入股票代码，如：AAPL、600036"
                required
              />
            </div>
            <div>
              <label htmlFor="stock_market_type" className="block text-sm font-medium mb-1">市场类型</label>
              <select
                id="stock_market_type"
                value={newStock.market_type}
                onChange={(e) => setNewStock({ ...newStock, market_type: e.target.value as 'CN' | 'HK' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500/50"
                aria-label="选择股票市场类型"
                title="选择股票所属市场：A股或港股"
              >
                <option value="CN">A股</option>
                <option value="HK">港股</option>
              </select>
            </div>
            <div>
              <label htmlFor="stock_display_name" className="block text-sm font-medium mb-1">显示名称（可选）</label>
              <input
                id="stock_display_name"
                type="text"
                value={newStock.display_name}
                onChange={(e) => setNewStock({ ...newStock, display_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500/50"
                placeholder="例如：苹果公司"
                title="输入股票显示名称，如：苹果公司、招商银行"
              />
            </div>
          </div>
          <button
            onClick={addAllowedStock}
            disabled={loading || !newStock.symbol.trim()}
            className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            添加股票
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">股票代码</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">市场</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">显示名称</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">操作</th>
                </tr>
              </thead>
              <tbody>
                {allowedStocks.map(stock => (
                  <tr key={stock.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-slate-900">{stock.symbol}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-slate-700">{getMarketName(stock.market_type)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-slate-700">{stock.display_name || '-'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => stock.id && deleteAllowedStock(stock.id)}
                        disabled={loading}
                        className="flex items-center gap-1 text-red-500 hover:text-red-600 text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
                {allowedStocks.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      暂无股票白名单，请添加允许访问的股票
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
