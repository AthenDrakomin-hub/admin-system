"use client";

import TradeAudit from "@/components/TradeAudit";
import { Package } from "lucide-react";

export default function BlockPage() {
  return <TradeAudit tradeType="block" title="大宗交易审核" icon={<Package className="w-6 h-6 text-primary" />} />;
}
