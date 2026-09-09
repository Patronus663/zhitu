# 知途（ZhiTu）智能学习 App 项目文档

## 一、项目概述

「知途」是一款面向南京大学学生、以**错题整理 + AI 学情分析 + 学习计划 + 智能检索**为核心的智能学习移动应用。用户可通过拍照/文字录入错题，AI 自动判题、分析错因、生成细粒度标签并沉淀到云端共享题库；同时提供题目检索（含联网补充）、学情分析、学习计划制定与跟进，以及"和知途聊聊"AI 问答助手。

项目为前后端分离的 monorepo：**Expo 54 + React Native**（前端）+ **Express.js**（后端）+ **Supabase (PostgreSQL)**（数据库）。

---

## 二、技术栈

| 层次 | 技术 | 说明 |
| --- | --- | --- |
| 前端 | Expo 54 / React Native 0.81 / React 19 | 移动优先，兼容 Android + iOS + Web |
| 前端导航 | expo-router（Stack + Tabs） | `client/app/` 路由配置 |
| 前端样式 | TailwindCSS（Uniwind）+ StyleSheet | `client/global.css` 主题设计令牌 |
| 状态/存储 | React Context、AsyncStorage、@supabase/supabase-js | AuthContext / UserContext |
| 后端 | Express.js（ESM + TypeScript） | `server/src/` |
| 数据库 | Supabase（PostgreSQL + Drizzle ORM） | 10 张表 |
| AI 能力 | 豆包 doubao-seed（LLM，`server/src/services/llm.ts`） | 判题、学情、计划、答题、聊天(SSE) |
| 联网检索 | 豆包 Web Search + 云端题库 | 题库不足时联网补充 |
| 认证 | Supabase Auth（邮箱 + 密码） | `x-session` 头部 |

---

## 三、功能模块

1. **错题整理**：拍照 / 文字输入 → AI 图像识别（`analyze-image`）→ AI 判题与解答（`ai-answer`）→ 标签生成与校验（`analyze` / `validate-tags`）→ 录入（同时写入云端题库 `questions` 与个人错题库 `user_questions`）→ 错因分析写入学情。
2. **题目检索**：选择范围（云端 / 个人错题），输入学科、知识点、方法、数量描述 → 大模型解析意图并按相关性/评分检索；题库不足时调用 `web_search` 联网补充并标注"来源于网络"；支持题目评分、反馈题目有误。
3. **学情分析**：读取用户学情长文本，结合学习计划生成 AI 建议；支持文字反馈修正学情。
4. **计划制定 / 跟进**：AI 生成学习计划（`plan_type` 区分 `daily` 与 `long_term`，长期计划只进"我的计划"）；今日/本周任务、完成打勾、进度统计、逾期任务迁移。
5. **和知途聊聊**：SSE 流式对话，结合用户学情/计划的 AI 问答，保存互动记录。
6. **用户与认证**：Supabase Auth 邮箱登录/注册；首次使用引导页（onboarding）收集称呼、专业、年级、目标等初始化用户学情。
7. **云端题库**：内置微积分 I / II 历年期末真题（2012–2024，经大模型规范化为结构化题目：题干、答案、知识点、方法、难度），与用户录入错题共享 `questions` 表。

---

## 四、目录结构

```
├── client/                     # React Native 前端
│   ├── app/                    # Expo Router 路由（仅路由配置，re-export screens）
│   │   ├── _layout.tsx         # 根布局（Stack + Provider + AuthProvider）
│   │   ├── (tabs)/             # 底部 Tab 导航（index/search/chat/profile）
│   │   ├── index.tsx           # 首页入口
│   │   ├── login.tsx / onboarding.tsx / question-entry.tsx ...
│   │   └── +not-found.tsx
│   ├── screens/                # 页面实现
│   │   ├── home / search / chat / profile       # 四大 Tab
│   │   ├── onboarding / login                   # 引导与登录
│   │   ├── question-entry / my-questions / question-detail  # 错题
│   │   ├── plan-create / my-plans / plan-detail / task-detail # 计划
│   ├── components/             # Screen / Provider 等可复用组件
│   ├── contexts/               # AuthContext / UserContext
│   ├── utils/                  # api.ts（后端 Api 封装）、supabase.ts
│   └── hooks/                  # useSafeRouter / useSafeSearchParams
├── server/                     # Express 后端
│   ├── src/
│   │   ├── index.ts            # 入口，挂载 /api/v1 各资源路由
│   │   ├── routes/             # users/questions/search/learning/plans/chat
│   │   ├── services/llm.ts     # 大模型调用封装
│   │   └── storage/database/   # supabase-client + Drizzle schema
│   └── scripts/                # 题库导入 / LaTeX 清理等维护脚本
├── .coze / .cozeproj           # 脚手架配置（禁止修改）
└── package.json                # monorepo 根
```

---

## 五、数据库表（Supabase PostgreSQL）

| 表 | 说明 | 关键字段 |
| --- | --- | --- |
| `users` | 用户 | id(nickname/major/grade/learning_goal/mastery_expectation/personalized_info/is_onboarded) |
| `questions` | 云端共享题库 | content/answer/images/subject/question_type/knowledge_points/methods/difficulty/rating/rating_count/is_active/created_by |
| `user_questions` | 用户个人错题库 | user_id/question_id/wrong_answer/error_analysis/is_mastered |
| `learning_profiles` | 用户学情（长文本） | user_id/strengths/weaknesses/learning_habits/error_patterns/mastered_points/weak_points |
| `study_plans` | 学习计划 | user_id/title/start_date/end_date/is_active/plan_type('daily'/'long_term') |
| `plan_items` | 计划任务项 | plan_id/title/due_date/is_completed/completed_at/sort_order |
| `chat_messages` | 聊天记录 | user_id/role/content |
| `usage_records` | 使用记录 | user_id/action_type/detail |
| `health_check` | 系统表 | updated_at |

---

## 六、后端 REST API（统一前缀 `/api/v1`）

> 认证：登录相关接口使用 Supabase Auth，前端通过 `x-session` 头携带 access_token（当前业务接口沿用基于 `user_id` 参数的鉴权体系）。

### 系统
- `GET /api/v1/health` — 健康检查
- `GET /api/v1/supabase-config` — 下发前端 supabase `{ url, anonKey }`

### users（`/api/v1/users`）
- `POST /` 创建用户（含 onboarding 初始化）
- `GET /:id` 查询用户
- `PUT /:id` 更新用户 / 补全 onboarding

### questions（`/api/v1/questions`）
- `POST /analyze-image`（multipart）AI 图像识别题目文字
- `POST /analyze` AI 判题 / 标签生成
- `POST /validate-tags` 校验用户修改后的标签
- `POST /ai-answer` AI 直接解答 + 分析（同时可用于自我训练）
- `POST /` 错题录入（写入云端 `questions` + 个人 `user_questions`，自动补全标签）
- `GET /` 云端/个人列表
- `GET /:id` 题目详情
- `DELETE /:id` 删除题目
- `POST /:id/rate` 题目评分
- `POST /:id/report` 反馈题目有误

### search（`/api/v1/search`）
- `POST /` 检索（云端或错题范围 + 联网补充）
- `POST /similar` 相似题推荐
- `POST /rate` 收录评分
- `POST /feedback` 题目纠错反馈

### learning（`/api/v1/learning`）
- `GET /:user_id` 读取学情
- `POST /analyze` AI 学情分析 + 建议
- `POST /:user_id/feedback` 用户文字/语音反馈修正学情
- `PUT /:user_id` 更新学情

### plans（`/api/v1/plans`）
- `GET /:user_id` 我的全部计划（含 total_items / completed_items）
- `GET /:user_id/active` 活跃计划
- `GET /:user_id/today` 今日任务（due_date == today）
- `GET /overdue/:user_id` 逾期任务
- `POST /move-overdue/:user_id` 逾期任务迁移到今日
- `POST /generate` AI 生成学习计划
- `POST /` 创建计划（支持计划与任务一次创建）
- `DELETE /:plan_id` 删除计划
- `GET /detail/:plan_id` 计划详情
- `POST /:plan_id/items` 添加任务项
- `PUT /items/:item_id` 编辑任务项
- `DELETE /items/:item_id` 删除任务项
- `POST /items/:item_id/move` 移动/延后日期
- `PUT /items/:item_id/complete` 标记完成（进度随完成数前进）

### chat（`/api/v1/chat`）
- `GET /:user_id/messages` 历史消息
- `POST /:user_id/messages` 发送消息（结合学情/计划）
- `POST /:user_id/stream` SSE 流式问答
- `DELETE /:user_id/history` 清空历史

---

## 七、前端路由

### 底部 Tab（`(tabs)`）
| Tab | 路由 | Screen | 说明 |
| --- | --- | --- | --- |
| 首页 | `(tabs)/index` | home | 今日/本周计划跟进、进度、逾期迁移弹窗 |
| 检索 | `(tabs)/search` | search | 题目检索（云端/个人）+ 评分反馈 |
| 知途 | `(tabs)/chat` | chat | AI 对话助手 |
| 我的 | `(tabs)/profile` | profile | 学情、登录/退出入口等 |

### Stack 页面
`/login`（登录/注册）、`/onboarding`（引导）、`/question-entry`（错题录入）、`/my-questions`（我的错题）、`/question-detail`、`/plan-create`（制定计划）、`/my-plans`（我的计划）、`/plan-detail`、`/task-detail`

---

## 八、登录认证（Supabase Auth）

- 前端通过 `GET /api/v1/supabase-config` 获取 `{ url, anonKey }` 初始化 supabase 客户端（`client/utils/supabase.ts`）。
- `client/contexts/AuthContext.tsx` 提供 `signIn / signUp / logout / user / token / isAuthenticated / updateUser`，session 持久化于 AsyncStorage，`onAuthStateChange` 自动同步登录态。
- 登录页 `client/screens/login/index.tsx`：邮箱 + 密码的登录/注册切换，南大风格 UI。
- 「我的」页提供登录 / 注册入口与退出登录。
- 说明：Supabase 默认邮箱需验证后才发放 session；如需"注册即登录"须在 Supabase 后台关闭"确认邮箱"或配置 SMTP。

---

## 九、运行与命令

```bash
# 开发启动（首次或重启前后端，自动杀占用端口进程）
coze dev

# 前端启动（Expo Web，端口 5000）
cd client && npm run start

# 后端启动（端口 9091）
cd server && NODE_ENV=development pnpm run dev

# 静态校验（tsc + eslint，client + server）
pnpm -w lint:all
pnpm -w lint:client   # 仅前端
pnpm -w lint:server   # 仅后端
```

**端口**：前端 Expo Web `5000`；后端 API `9091`。

---

## 十、环境变量（后端）

| 变量 | 用途 |
| --- | --- |
| `EXPO_PUBLIC_BACKEND_BASE_URL` | 前端访问后端的 Base URL（系统注入，禁止修改） |
| `COZE_SUPABASE_URL` / `COZE_SUPABASE_ANON_KEY` | Supabase 连接 URL 与匿名 key |
| `COZE_SC_WORKLOAD_KEY_JOB`（服务密钥，用于 DDL/服务端） | 由 supabase-client 读取 |

---

## 十一、维护脚本（`server/scripts/`）

| 脚本 | 用途 |
| --- | --- |
| `import_qbank.ts` | 把期末试卷 txt 规范化（调 LLM）并批量导入云端题库 |
| `complete_answers.ts` | 为缺答案的题目调用 LLM 补全答案 |
| `convert_tex.ts` | 将题库中的 LaTeX 命令（\frac、\sqrt 等）转换为可读数学符号 |

---

## 十二、其他说明

- **云端题库数据**：已内置并批量导入 2012–2024 微积分 I / II 历届期末真题（经规范化为结构化题目）；所有用户录入的错题也会自动沉淀进云端题库供全平台检索。
- **主题**：默认跟随系统，可在 `client/components/ColorSchemeUpdater.tsx` 的 `DEFAULT_THEME` 切换暗色/亮色；设计令牌见 `client/global.css`。
- 当前交付形态为**源代码工程**；未生成可分发安装包（APK/IPA），亦无公网部署链接。