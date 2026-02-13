import { NextRequest } from 'next/server';

export async function verifyAuth(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  
  // TODO: 实现 JWT 验证逻辑
  return { id: '1', role: 'admin' };
}
