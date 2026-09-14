# 知途（ZhiTu）测试文档

> 文档编号：ZhiTu-TEST-2026-004 · 版本：v1.0 · 状态：定稿
> 本文档描述「知途」项目的测试策略、静态校验、接口冒烟测试与典型验收用例。

---

## 1. 测试概述

本项目采用**轻量级人工 + 静态校验 + 接口冒烟**的组合测试方式（不依赖重型测试框架，如 Jest），保证交付质量的前提下降低运行成本。

| 层级 | 手段 | 说明 |
| --- | --- | --- |
| 静态校验 | TSC + ESLint | 前后端类型与规范检查 |
| 接口冒烟 | curl 真实调用 | 后端路由注册与返回格式验证 |
| 服务存活 | curl 端口探测 | 前端 5000 / 后端 9091 响应 |
| UI 验收 | 手动/预览 | 三端页面交互与布局 |

---

## 2. 静态校验（TSC + ESLint）

```bash
pnpm -w lint:all      # client + server 同时校验
pnpm -w lint:client   # 仅前端
pnpm -w lint:server   # 仅后端
```

**通过标准**：无报错。

---

## 3. 环境与端口

| 服务 | 端口 | 启动 |
| --- | --- | --- |
| Expo Web（前端） | 5000 | `cd client && npm run start` |
| Express（后端） | 9091 | `cd server && NODE_ENV=development pnpm run dev` |
| 综合启动/重启 | — | `coze dev` |

---

## 4. 接口冒烟测试（API Smoke Test）

> 修改后端代码后必须重启后端服务（`pnpm run dev` 内部会 kill 旧服务）再执行。

```bash
# 健康检查
curl http://localhost:9091/api/v1/health
# 期望：{"status":"ok"}

# 前端 supabase 配置
curl http://localhost:9091/api/v1/supabase-config
# 期望：{"url": "...", "anonKey": "..."}

# 上传错题照片
curl -X POST http://localhost:9091/api/v1/questions/upload \
  -F "images=@/path/to.jpg"
# 期望：{"urls": ["..."]}，且 GET /uploads/<file> 返回 200

# 创建用户
curl -X POST -H "Content-Type: application/json" \
  -d '{"nickname":"测试"}' \
  http://localhost:9091/api/v1/users
# 期望：{"user": {...}}

# 创建计划
curl -X POST -H "Content-Type: application/json" \
  -d '{"user_id":"UID","title":"测试计划","plan_type":"daily"}' \
  http://localhost:9091/api/v1/plans
# 期望：返回 plan 对象
```

**通过标准**：返回 JSON 格式正确，无 500 错误。

---

## 5. 服务存活探测

```bash
curl -I http://localhost:5000          # 前端：期望 HTTP 200
curl http://localhost:9091/api/v1/health  # 后端：期望 {"status":"ok"}
```

---

## 6. 路由一致性检查

- 每个 `Tabs.Screen name="xxx"` 有对应 `xxx.tsx` 文件。
- 每个路由文件 re-export 的 `@/screens/xxx` 目录存在。
- `Tabs` 导航首页：`app/index.tsx` 与 `(tabs)/index.tsx` 并存时关系正确（首页作为登录态门卫）。
- Stack 页面均在 `_layout.tsx` 注册为 `<Stack.Screen name="xxx">`。
- 后端 Express 路由遵循"静态路由在前、动态路由在后、通配符最后"的顺序。

---

## 7. 功能验收用例（手动 / 预览）

### 7.1 账号与引导
| 用例 | 操作 | 预期 |
| --- | --- | --- |
| TC-1.1 | 邮箱注册 | 注册成功，进入 onboarding 或首页 |
| TC-1.2 | 邮箱登录 | 登录成功，跳转首页 |
| TC-1.3 | 重启 App | 登录态保持 |
| TC-1.4 | 首次引导 | 填写称呼/专业/年级/目标后进入首页 |

### 7.2 错题整理
| 用例 | 操作 | 预期 |
| --- | --- | --- |
| TC-2.1 | 拍照/选择图片录入 | 图片识别为题文 |
| TC-2.2 | AI 判题 | 返回解答与错因 |
| TC-2.3 | 标签校验 | 修改标签后校验通过 |
| TC-2.4 | 提交错题含照片 | 数据库中 images 为公网 URL |
| TC-2.5 | 查看错题详情 | **照片正常回显**（关键） |

### 7.3 题目检索
| 用例 | 操作 | 预期 |
| --- | --- | --- |
| TC-3.1 | 检索云端 | 返回相关题目 |
| TC-3.2 | 检索个人错题 | 仅返回本人题目 |
| TC-3.3 | 题库不足 | 返回联网补充并标注来源 |
| TC-3.4 | 题目评分 | 评分成功，权重更新 |

### 7.4 学情分析
| 用例 | 操作 | 预期 |
| --- | --- | --- |
| TC-4.1 | 查看学情 | 展示学情画像 |
| TC-4.2 | AI 学情分析 | 生成建议 |
| TC-4.3 | 反馈修正 | 学情更新 |

### 7.5 学习计划
| 用例 | 操作 | 预期 |
| --- | --- | --- |
| TC-5.1 | 首页新增今日任务 | 弹窗居中展示，任务入列 |
| TC-5.2 | 首页新增本周计划 | 弹窗居中展示 |
| TC-5.3 | 完成打勾 | 进度前进 |
| TC-5.4 | 逾期迁移 | 逾期任务移到今日 |

### 7.6 智能问答
| 用例 | 操作 | 预期 |
| --- | --- | --- |
| TC-6.1 | 提问 | SSE 流式逐字输出 |
| TC-6.2 | 长答案 | 页面可下滑查看全部内容 |
| TC-6.3 | 历史记录 | 可回查，可清空 |

---

## 8. 部署相关测试

### 8.1 生产上传目录
- 确认生产 `uploadsDir = /tmp/zhitoo-uploads`（可写），开发 = 项目 `uploads`。
- 上传功能在生产不可因目录只读崩溃（`mkdirSync` 有 try/catch）。

```bash
# 本地以生产模式自测
cd server && NODE_ENV=production node dist/index.js
curl http://localhost:5000/api/v1/health   # 期望 ok
ls -ld /tmp/zhitoo-uploads                  # 期望存在且可写
```

### 8.2 日志校验
```bash
tail -n 50 /app/work/logs/bypass/app.log
tail -n 50 /app/work/logs/bypass/console.log
```
通过标准：无"新"报错（忽略历史报错，静默视为通过）。

---

## 9. 已知问题与风险

| 项 | 说明 | 建议 |
| --- | --- | --- |
| 业务接口未校验 `x-session` | 存在越权（IDOR）风险 | 补齐 token 鉴权中间件 |
| 后端业务逻辑集中在 routes | 影响可维护可测性 | 抽离 service/repository 后可加单元测试 |
| 无自动化测试框架 | 回归依赖人工 | 后续引入 Vitest / RN Testing Library |

> 文档随项目迭代持续更新。