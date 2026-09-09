import type { Request, Response, NextFunction } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client.js';

declare module 'express-serve-static-core' {
  interface Request {
    authUserId: string;
  }
}

const SESSION_HEADER = 'x-session';

export function extractSessionToken(req: Request): string | undefined {
  const sessionHeader = req.headers[SESSION_HEADER];
  if (typeof sessionHeader === 'string' && sessionHeader.trim()) {
    return sessionHeader.trim();
  }
  const authHeader = req.headers['authorization'];
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim() || undefined;
  }
  return undefined;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractSessionToken(req);
    if (!token) {
      res.status(401).json({ error: '未登录：缺少 x-session 凭证' });
      return;
    }

    const client = getSupabaseClient();
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user) {
      res.status(401).json({ error: '登录状态无效或已过期' });
      return;
    }

    req.authUserId = data.user.id;
    next();
  } catch (err: any) {
    res.status(401).json({ error: `鉴权失败: ${err?.message || '未知错误'}` });
  }
}
