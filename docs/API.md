# 知途（ZhiTu）API 接口文档

> 文档编号：ZhiTu-API-2026-003 · 版本：v1.0 · 状态：定稿
> Base URL：`${EXPO_PUBLIC_BACKEND_BASE_URL}`（前端）／ 本地 `http://localhost:9091`

---

## 0. 通用约定

- **统一前缀**：所有业务接口使用 `/api/v1`。
- **请求体**：JSON（`Content-Type: application/json`）；文件上传用 `multipart/form-data`。
- **认证说明**：登录相关使用 Supabase Auth，前端通过 `x-session` 头携带 access_token；**业务接口当前沿用基于 `user_id` 参数的鉴权体系**（见"已知技术债"）。
- **响应结构**：成功直接返回业务数据（对象/数组）；失败返回 JSON，含 `error` 字段。
- **错误码**：HTTP 状态码语义化（200 成功、400 参数错误、404 不存在、500 服务端异常）。

---

## 1. 系统

### `GET /api/v1/health`
健康检查。
- 响应：`{ "status": "ok" }`

### `GET /api/v1/supabase-config`
下发前端 Supabase 初始化配置（url + anonKey，anonKey 为可公开的客户端 key）。
- 响应：`{ "url": string, "anonKey": string }`

---

## 2. 用户 Users — `/api/v1/users`

### `POST /api/v1/users`
创建用户（含 onboarding 初始化）。
- Body：`{ id?: string, nickname: string, major?: string, grade?: string, learning_goal?: string, mastery_expectation?: string, personalized_info?: string }`
- 响应：`{ "user": object }`

### `GET /api/v1/users/:id`
查询用户。
- Path：`id: string`
- 响应：`{ "user": object }`

### `PUT /api/v1/users/:id`
更新用户 / 补全 onboarding。
- Path：`id: string`
- Body：`{ nickname?, major?, grade?, learning_goal?, mastery_expectation?, personalized_info?, is_onboarded?: boolean }`
- 响应：`{ "user": object }`

---

## 3. 错题 Questions — `/api/v1/questions`

### `POST /api/v1/questions/analyze-image`
AI 图像识别题目文字（multipart）。
- Body：FormData，字段 `images[]`（文件）
- 响应：`{ "text": string }`

### `POST /api/v1/questions/analyze`
AI 判题 / 标签生成。
- Body：`{ content: string, wrong_answer?: string, correct_answer?: string }`
- 响应：`{ "analysis": object }`

### `POST /api/v1/questions/validate-tags`
校验用户修改后的标签。
- Body：`{ content: string, subject: string, question_type: string, knowledge_points: string[], methods: string[], difficulty: number }`
- 响应：`{ "validation": object }`

### `POST /api/v1/questions/ai-answer`
AI 直接解答 + 错因分析（可用于自我训练）。
- Body：`{ content: string, wrong_answer?: string }`
- 响应：`{ "ai_result": object }`

### `POST /api/v1/questions/upload`
错题照片上传（multipart），返回公网 URL（供写入题目 / 详情回显）。
- Body：FormData，字段 `images[]`（files）
- 响应：`{ "urls": string[] }`

### `POST /api/v1/questions`
错题录入（写入云端 `questions` + 个人 `user_questions`，自动补全标签）。
- Body：`{ content, images?, subject?, question_type?, knowledge_points?, methods?, difficulty?, user_id?, wrong_answer?, error_analysis? }`
- 响应：`{ question, user_question }`

### `GET /api/v1/questions`
云端/个人列表。
- Query：`{ scope?: 'cloud'|'mine', user_id?, subject?, query? }`
- 响应：数组

### `GET /api/v1/questions/:id`
题目详情。
- Path：`id: string`

### `DELETE /api/v1/questions/:id`
删除题目。

### `POST /api/v1/questions/:id/rate`
题目评分。
- Body：`{ rating: number }`

### `POST /api/v1/questions/:id/report`
反馈题目有误。

---

## 4. 检索 Search — `/api/v1/search`

### `POST /api/v1/search`
检索（云端或错题范围 + 联网补充）。
- Body：`{ scope?, subject?, knowledge_points?, methods?, count?, user_id? }`
- 响应：题目列表（联网结果标注"来源于网络"）

### `POST /api/v1/search/similar`
相似题推荐。
- Body：`{ question_id: string, user_id? }`

### `POST /api/v1/search/rate`
收录评分（动态调整推荐权重）。
- Body：`{ question_id: string, rating: number, user_id? }`

### `POST /api/v1/search/feedback`
题目纠错反馈。

---

## 5. 学情 Learning — `/api/v1/learning`

### `GET /api/v1/learning/:user_id`
读取学情。

### `POST /api/v1/learning/analyze`
AI 学情分析 + 建议。
- Body：`{ user_id: string }` 或学情上下文

### `POST /api/v1/learning/:user_id/feedback`
用户文字/语音反馈修正学情。
- Body：`{ message: string }`

### `PUT /api/v1/learning/:user_id`
更新学情。
- Body：学情字段

---

## 6. 计划 Plans — `/api/v1/plans`

### `GET /api/v1/plans/:user_id`
我的全部计划（含 `total_items` / `completed_items`）。

### `GET /api/v1/plans/:user_id/active`
活跃计划。

### `GET /api/v1/plans/:user_id/today`
今日任务（`due_date == today`）。

### `GET /api/v1/plans/overdue/:user_id`
逾期任务。

### `POST /api/v1/plans/move-overdue/:user_id`
逾期任务迁移到今日。

### `POST /api/v1/plans/generate`
AI 生成学习计划。
- Body：`{ user_id, ... }`

### `POST /api/v1/plans`
创建计划（支持计划与任务一次创建）。
- Body：`{ user_id, title, plan_type?, start_date?, end_date?, items?: Array<{title, due_date?, description?}> }`

### `DELETE /api/v1/plans/:plan_id`
删除计划。

### `GET /api/v1/plans/detail/:plan_id`
计划详情。

### `POST /api/v1/plans/:plan_id/items`
添加任务项。
- Body：`{ title, due_date?, description? }`

### `PUT /api/v1/plans/items/:item_id`
编辑任务项。

### `DELETE /api/v1/plans/items/:item_id`
删除任务项。

### `POST /api/v1/plans/items/:item_id/move`
移动/延后日期。
- Body：`{ due_date: string }`

### `PUT /api/v1/plans/items/:item_id/complete`
标记完成（进度随完成数前进）。
- Body：`{ is_completed: boolean }`

---

## 7. 聊天 Chat — `/api/v1/chat`

### `GET /api/v1/chat/:user_id/messages`
历史消息。

### `POST /api/v1/chat/:user_id/messages`
发送消息（结合学情/计划）。
- Body：`{ content: string }`

### `POST /api/v1/chat/:user_id/stream`
SSE 流式问答。
- Body：`{ content: string }`（或消息数组）
- 响应：`text/event-stream`，逐 chunk 推送，结束发送 `data: [DONE]`

### `DELETE /api/v1/chat/:user_id/history`
清空历史。

---

## 8. 静态资源与上传

### `GET /uploads/<file>`
访问后端托管的错题照片（静态）。
- 生产目录：`/tmp/zhitoo-uploads`；开发目录：项目 `uploads/`。

---

## 9. 常用 curl 示例

```bash
# 健康检查
curl http://localhost:9091/api/v1/health

# 查询用户
curl http://localhost:9091/api/v1/users/<id>

# 上传错题照片
curl -X POST http://localhost:9091/api/v1/questions/upload \
  -F "images=@/path/to/photo.jpg"

# 创建计划
curl -X POST -H "Content-Type: application/json" \
  -d '{"user_id":"uid","title":"期末复习","plan_type":"daily"}' \
  http://localhost:9091/api/v1/plans
```

> 备注：部分返回字段（如 `analysis`、`ai_result`、`validation` 的具体结构）取决于 AI 响应，前端以实际接口返回为准；具体实现可参考 `client/utils/api.ts` 中逐接口注释。