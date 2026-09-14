# 知途（ZhiTu）架构与设计文档

> 文档编号：ZhiTu-ARCH-2026-002 · 版本：v1.0 · 状态：定稿

---

## 1. 架构总览

「知途」采用**前后端分离的 monorepo** 架构，基于 pnpm workspace 组织。

```
┌────────────────────┐        HTTP/HTTPS         ┌────────────────────┐
│  client (Expo RN)  │  ◄─────────────────────►  │  server (Express)  │
│  expo-router       │   /api/v1  (REST + SSE)   │  routes → services │
│  React Context     │                           │     ↓              │
│  Tailwind(Uniwind) │                           │  Supabase (PGSQL)  │
└────────────────────┘                           └────────┬───────────┘
       │  图片/文件上传 FormData                            │ Drizzle ORM
       ▼                                                 ▼
  server /uploads (静态)                           豆包 doubao-seed LLM + WebSearch
```

## 2. 技术选型

| 层次 | 选型 | 理由 |
| --- | --- | --- |
| 前端框架 | Expo 54 + React Native 0.81 | 三端统一，官方库即用 |
| 前端导航 | expo-router（Stack + Tabs） | 文件式路由、类型友好 |
| 前端样式 | TailwindCSS（Uniwind）+ StyleSheet | 主题令牌统一管理 |
| 状态管理 | React Context（Auth/User）+ AsyncStorage | 轻量、无额外依赖 |
| 后端 | Express.js（ESM + TypeScript） | 生态成熟、灵活 |
| 数据库 | Supabase PostgreSQL + Drizzle ORM | 托管、类型安全 |
| AI | 豆包 doubao-seed（coze-coding-dev-sdk） | 判题/学情/计划/答疑 |
| 认证 | Supabase Auth（邮箱+密码） | 开箱即用 |

## 3. 目录结构

```
client/
├── app/                  # Expo Router 路由（仅配置，re-export screens）
│   ├── _layout.tsx       # 根布局：Stack + Provider + AuthProvider
│   ├── (tabs)/_layout.tsx# 底部 Tab（index/search/chat/profile）
│   ├── index.tsx         # 首页（登录态门卫，重定向到 (tabs) 或 /onboarding）
│   └── *.tsx            # 其余 Stack 页面路由
├── screens/              # 页面实现
│   ├── home / search / chat / profile       # 四大 Tab
│   ├── onboarding / login                   # 引导与登录
│   ├── question-entry / my-questions / question-detail  # 错题
│   └── plan-create / my-plans / plan-detail / task-detail# 计划
├── components/           # Screen / Provider / SmartDateInput 等
├── contexts/             # AuthContext / UserContext
├── hooks/                # useSafeRouter / useSafeSearchParams
├── utils/                # api.ts（后端封装）、supabase.ts
└── global.css            # 主题 design tokens
server/
├── src/
│   ├── index.ts          # 入口，中间件 + 路由挂载 + 静态托管
│   ├── routes/           # users / questions / search / learning / plans / chat
│   ├── services/llm.ts   # 大模型调用封装（invoke + stream）
│   └── storage/
│       ├── database/     # supabase-client + Drizzle schema
│       └── ...           # 数据访问
└── scripts/              # 题库导入 / LaTeX 清理等维护脚本
assets/                   # 共享静态资源
```

## 4. 前端设计

### 4.1 路由结构
- **底部 Tab**：`(tabs)/index`（首页）、`(tabs)/search`（检索）、`(tabs)/chat`（知途）、`(tabs)/profile`（我的）。
- **Stack 页面**：`/login`、`/onboarding`、`/question-entry`、`/my-questions`、`/question-detail`、`/plan-create`、`/my-plans`、`/plan-detail`、`/task-detail`。
- `app/index.tsx` 作为登录态门卫，与 `(tabs)/index.tsx` 并存（注意两者关系）。

### 4.2 关键机制
- **安全导航**：使用 `useSafeRouter` / `useSafeSearchParams`，规避 URL 编解码与类型丢失问题。
- **页面容器**：统一使用 `@/components/Screen` 包裹，处理安全区/键盘/状态栏。
- **页面进入刷新**：数据可能在其它页被修改，列表页使用 `useFocusEffect`。
- **API 封装**：`utils/api.ts` 提供 `request`（JSON）与 `uploadFile`（FormData）两类请求，并逐个接口编写服务端注释。
- **文件上传**：本地 URI 照片经 `createFormDataFile` 组装为 FormData 上传，服务端返回公网 URL。

## 5. 后端设计

### 5.1 分层
`routes/`（HTTP 边界）→（service 逻辑，部分尚在 routes 内）→ `storage/database`（Drizzle 数据访问）。

### 5.2 统一约定
- API 前缀：`/api/v1`。
- 中间件：CORS、`express.json({ limit:'50mb' })`、`express.urlencoded`。
- 静态资源：`/uploads` 挂载错题照片访问。
- 生产托管：若存在 `client/dist` 前端产物，由后端一体化托管并提供 SPA 回退（非 `/api` 请求回退 `index.html`）。

### 5.3 上传目录策略（关键）
- 生产环境 `NODE_ENV === 'production'`：`path.resolve('/tmp', 'zhitoo-uploads')`（平台可写临时区）。
- 开发环境：`path.resolve(process.cwd(), 'uploads')`。
- `mkdirSync` 用 `try/catch` 包裹，**目录创建失败不阻塞服务启动**，仅记录告警。

### 5.4 错误处理
- `notFoundHandler`：404 兜底（注册于路由之后）。
- `errorHandler`：统一捕获 Multer 文件大小错误与通用错误。

## 6. 数据设计（数据库）

> 详见 `server/src/storage/database/shared/schema.ts`（Drizzle）。

### 6.1 ER 概览
```
users 1─N user_questions N─1 questions
users 1─N learning_profiles
users 1─N study_plans 1─N plan_items
users 1─N chat_messages
users 1─N usage_records
```

### 6.2 表说明
| 表 | 用途 | 索引要点 |
| --- | --- | --- |
| `health_check` | 系统健康表（勿删） | — |
| `users` | 用户 | created_at |
| `questions` | 云端共享题库 | subject/difficulty/rating/is_active/created_by |
| `user_questions` | 个人错题 | user_id/question_id/is_mastered |
| `learning_profiles` | 学情长文本 | user_id |
| `study_plans` | 学习计划 | user_id/is_active/plan_type |
| `plan_items` | 计划任务 | plan_id/due_date/is_completed |
| `chat_messages` | 聊天记录 | user_id/created_at |
| `usage_records` | 使用记录 | user_id/action_type |

### 6.3 关键字段要点
- `questions.knowledge_points` / `methods`：`jsonb` 数组。
- `study_plans.plan_type`：`'daily' | 'long_term'`。
- 主键均默认 `gen_random_uuid()`；时间字段 `withTimezone`。

## 7. AI 服务设计

`server/src/services/llm.ts` 封装豆包大模型：
- `invokeLLM(messages, options, headers)`：非流式调用，默认模型 `doubao-seed-2-0-lite-260215`，温度默认 0.7。
- `streamLLM(...)`：异步生成器，逐块 yield 内容，用于 SSE 流式输出。
- 支持多模态消息（`image_url`），支撑图像识别。

## 8. 部署与运行

| 场景 | 命令 | 端口 |
| --- | --- | --- |
| 首次/重启 | `coze dev` | 前端 5000 / 后端 9091 |
| 前端（Expo Web） | `cd client && npm run start` | 5000 |
| 后端 | `cd server && NODE_ENV=development pnpm run dev` | 9091 |
| 生产构建 | `pnpm run build`（node build.js → dist）+ `pnpm run start` | server.js 入口 |
| 静态校验 | `pnpm -w lint:all` / `lint:client` / `lint:server` | — |

- 生产 `server.js`（`.coze` 配置 entrypoint）在 `NODE_ENV=production` 下运行 `dist/index.js`。
- 生产环境上传目录不可写场景已通过 `/tmp` 方案规避。

## 9. 已知技术债与演进建议
1. **接口鉴权**：业务接口依赖 `user_id` 参数而非校验 `x-session`，存在 IDOR 风险，建议补齐 token 鉴权中间件。
2. **后端分层**：`routes/` 业务偏重（如 plans 540+ 行），建议抽离 service/repository。
3. **数据完善**：外键未配级联删除、无 migrations，建议补齐。