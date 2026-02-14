import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const hour = new Date().getHours();
  const results = [];

  try {
    // 09:00 - 行情刷新
    if (hour === 9) {
      const marketRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/cron`);
      const marketData = await marketRes.json();
      results.push({ task: '行情刷新', ...marketData });
    }

    // 16:00 - 每日结算（如需要）
    if (hour === 16) {
      // TODO: 添加每日结算逻辑
      results.push({ task: '每日结算', success: true, message: '暂未实现' });
    }

    return NextResponse.json({
      success: true,
      time: new Date().toISOString(),
      hour,
      results
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
