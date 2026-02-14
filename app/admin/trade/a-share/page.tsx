"use client";

import TradeAudit from "@/components/TradeAudit";
import { TrendingUp } from "lucide-react";

export default function ASharePage() {
  return <TradeAudit tradeType="a-share" title="A股交易审核" icon={<TrendingUp className="w-6 h-6 text-primary" />} />;
}
