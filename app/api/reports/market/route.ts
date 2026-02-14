import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const data = [
      {
        date: new Date().toLocaleDateString(),
        successRate: 99.5,
        topStocks: ['600000', '000858', '000651'],
        refreshCount: 1250,
        avgResponseTime: 245,
      },
      {
        date: new Date(Date.now() - 86400000).toLocaleDateString(),
        successRate: 99.2,
        topStocks: ['600000', '000858', '000651'],
        refreshCount: 1180,
        avgResponseTime: 268,
      },
      {
        date: new Date(Date.now() - 172800000).toLocaleDateString(),
        successRate: 98.8,
        topStocks: ['600000', '000858', '000651'],
        refreshCount: 1320,
        avgResponseTime: 312,
      },
    ];

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
