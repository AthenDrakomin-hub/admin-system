"use client";

import TradeAudit from "@/components/TradeAudit";
import { Globe } from "lucide-react";

export default function HKSharePage() {
  return <TradeAudit tradeType="hk-share" title="港股交易审核" icon={<Globe className="w-6 h-6 text-primary" />} />;
}
