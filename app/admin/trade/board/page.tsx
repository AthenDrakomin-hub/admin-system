"use client";

import TradeAudit from "@/components/TradeAudit";
import { Zap } from "lucide-react";

export default function BoardPage() {
  return <TradeAudit tradeType="board" title="一键打板审核" icon={<Zap className="w-6 h-6 text-primary" />} />;
}
