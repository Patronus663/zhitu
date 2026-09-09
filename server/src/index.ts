import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { getSupabaseCredentials } from './storage/database/supabase-client.js';
import { requireAuth } from './middleware/auth.js';
import userRoutes from './routes/users.js';
import questionRoutes from './routes/questions.js';
import searchRoutes from './routes/search.js';
import learningRoutes from './routes/learning.js';
import planRoutes from './routes/plans.js';
import chatRoutes from './routes/chat.js';

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Supabase 前端初始化配置（anonKey 为可公开的客户端 key，仅用于前端创建 supabase 客户端）
app.get('/api/v1/supabase-config', (_req, res) => {
  try {
    const creds = getSupabaseCredentials();
    res.status(200).json({ url: creds.url, anonKey: creds.anonKey });
  } catch (e) {
    res.status(500).json({ error: 'supabase 配置不可用' });
  }
});

// Routes（全部业务路由需要登录）
app.use('/api/v1/users', requireAuth, userRoutes);
app.use('/api/v1/questions', requireAuth, questionRoutes);
app.use('/api/v1/search', requireAuth, searchRoutes);
app.use('/api/v1/learning', requireAuth, learningRoutes);
app.use('/api/v1/plans', requireAuth, planRoutes);
app.use('/api/v1/chat', requireAuth, chatRoutes);

// 404
app.use((_req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// Global error handler（必须最后挂载）
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: '文件大小超过限制（最大 10MB）' });
  }
  console.error('[Unhandled Error]', err);
  if (res.headersSent) return;
  res.status(err?.status || 500).json({ error: err?.message || '服务器内部错误' });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
