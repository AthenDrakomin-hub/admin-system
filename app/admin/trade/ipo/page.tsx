"use client";

import TradeAudit from "@/components/TradeAudit";
import { Sparkles } from "lucide-react";

export default function IPOPage() {
  return <TradeAudit tradeType="ipo" title="新股申购审核" icon={<Sparkles className="w-6 h-6 text-primary" />} />;
}
