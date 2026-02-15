"use client";

import { useState, useEffect } from "react";
import TradeAudit from "@/components/TradeAudit";
import { Zap } from "lucide-react";
import { AdminPermissions } from "@/types/admin";

export default function BoardPage() {
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
      tradeType="board" 
      title="一键打板审核" 
      icon={<Zap className="w-6 h-6 text-primary" />}
      adminPermissions={adminPermissions}
    />
  );
}
