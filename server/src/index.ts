import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabaseCredentials } from './storage/database/supabase-client.js';
import { notFoundHandler, errorHandler } from './utils/errors.js';
import userRoutes from './routes/users.js';
import questionRoutes from './routes/questions.js';
import searchRoutes from './routes/search.js';
import learningRoutes from './routes/learning.js';
import planRoutes from './routes/plans.js';
import chatRoutes from './routes/chat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

// 上传的静态图片资源（错题照片等）。基于进程工作目录（生产环境 CWD 为可写区），
// 避免依赖 project 根目录在只读部署环境中出现权限错误。
const uploadsDir = path.resolve(process.cwd(), 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (err) {
  // 目录创建失败不可阻塞服务启动；仅记录告警，写入图片时再按需重试
  console.warn('[uploads] 目录不可写，上传功能可能不可用:', (err as Error).message);
}
app.use('/uploads', express.static(uploadsDir));

// 生产模式：若存在前端静态产物（Expo web export 输出），由后端一体化托管
// 便于"整个项目"作为单个可执行进程运行（dev 模式不受影响）
const clientDist = path.resolve(__dirname, '../../client/dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // SPA 兜底：非 API 请求回退到 index.html，保证前端路由可刷新
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// 404 兜底（需在路由之后注册）
app.use(notFoundHandler);

// 统一错误处理（Multer 文件大小错误 + 通用错误）
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
