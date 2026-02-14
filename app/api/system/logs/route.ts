import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // 模拟系统日志数据
    const logs = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        level: 'info',
        service: 'api',
        message: 'API request processed',
        details: 'GET /api/user - 200ms',
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        level: 'warning',
        service: 'database',
        message: 'Slow query detected',
        details: 'Query took 1500ms',
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 10800000).toISOString(),
        level: 'error',
        service: 'market',
        message: 'Failed to fetch market data',
        details: 'Connection timeout',
      },
    ];

    const filtered = type === 'all' ? logs : logs.filter((l) => l.level === type);
    const from = (page - 1) * limit;
    const data = filtered.slice(from, from + limit);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: filtered.length,
        pages: Math.ceil(filtered.length / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
