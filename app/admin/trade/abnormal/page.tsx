"use client";

import TradeAudit from "@/components/TradeAudit";
import { AlertTriangle } from "lucide-react";

export default function AbnormalOrdersPage() {
  return <TradeAudit tradeType="abnormal" title="异常订单审核" icon={<AlertTriangle className="w-6 h-6 text-red-600" />} />;
}
