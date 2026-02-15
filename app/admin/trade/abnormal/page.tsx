"use client";

import { useState, useEffect } from "react";
import TradeAudit from "@/components/TradeAudit";
import { AlertTriangle } from "lucide-react";
import { AdminPermissions } from "@/types/admin";

export default function AbnormalOrdersPage() {
  const [adminPermissions, setAdminPermissions] = useState<AdminPermissions | null>(null);

  useEffect(() => {
    // 从localStorage获取管理员权限
    const permissionsStr = localStorage.getItem('adminPermissions');
    if (permissionsStr) {
      try {
        setAdminPermissions(JSON.parse(permissionsStr));
      } catch (error) {
        console.error('解析管理员权限失败:', error);
      }
    }
  }, []);

  return (
    <TradeAudit 
      tradeType="abnormal" 
      title="异常订单审核" 
      icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
      adminPermissions={adminPermissions}
    />
  );
}
