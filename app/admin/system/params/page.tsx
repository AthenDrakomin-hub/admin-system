"use client";

import { useState } from "react";
import { Settings, Save, RefreshCw } from "lucide-react";
import { defaultConfig } from "@/types/config";

export default function ParamsPage() {
  const [config, setConfig] = useState(defaultConfig);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-slate-900">全局参数配置中心</h1>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-600">
          <Save className="w-5 h-5" />
          保存配置
        </button>
      </div>

      <div className="space-y-6">
        {/* 汇率配置 */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">汇率配置</h2>
            <button className="flex items-center gap-2 text-sm text-primary hover:text-primary-600">
              <RefreshCw className="w-4 h-4" />
              刷新汇率
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">HKD/CNY 汇率</label>
              <input
                type="number"
                step="0.0001"
                value={config.exchange_rates.hkd_cny}
                onChange={(e) => setConfig({...config, exchange_rates: {...config.exchange_rates, hkd_cny: parseFloat(e.target.value)}})}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">更新时间</label>
              <input
                type="text"
                value={new Date(config.exchange_rates.update_time).toLocaleString()}
                disabled
                className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50"
              />
            </div>
          </div>
        </div>

        {/* 手续费配置 */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">手续费配置</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">A股佣金率</label>
              <input
                type="number"
                step="0.0001"
                value={config.fees.a_share_commission}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">A股印花税率</label>
              <input
                type="number"
                step="0.0001"
                value={config.fees.a_share_stamp_duty}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">A股最低佣金</label>
              <input
                type="number"
                value={config.fees.a_share_min_commission}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* 打板限额 */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">打板限额配置</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">每日用户限额</label>
              <input
                type="number"
                value={config.board_limits.daily_user_quota}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">人工审核阈值</label>
              <input
                type="number"
                value={config.board_limits.manual_approval_threshold}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* 大宗交易门槛 */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">大宗交易门槛</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">最低金额</label>
              <input
                type="number"
                value={config.block_thresholds.min_amount}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">最大折扣率</label>
              <input
                type="number"
                step="0.01"
                value={config.block_thresholds.max_discount_rate}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* 提现规则 */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">提现规则</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">最低金额</label>
              <input
                type="number"
                value={config.withdraw_rules.min_amount}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">最高金额</label>
              <input
                type="number"
                value={config.withdraw_rules.max_amount}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">每日限额</label>
              <input
                type="number"
                value={config.withdraw_rules.daily_limit}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.withdraw_rules.require_flow_settled}
                onChange={(e) => setConfig({...config, withdraw_rules: {...config.withdraw_rules, require_flow_settled: e.target.checked}})}
                className="w-4 h-4 text-primary rounded"
              />
              <span className="text-sm text-slate-700">要求流水结清后才能提现</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
