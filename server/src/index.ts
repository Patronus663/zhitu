import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { getSupabaseCredentials } from './storage/database/supabase-client.js';
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

// Routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/questions', questionRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/learning', learningRoutes);
app.use('/api/v1/plans', planRoutes);
app.use('/api/v1/chat', chatRoutes);

// Multer error handling
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: '文件大小超过限制（最大 10MB）' });
  }
  next(err);
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
