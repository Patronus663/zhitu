# 知途（ZhiTu）开发计划

> 项目现状：半成品接手，主链路可跑通；最终目标为**安卓 APK 集成发布**。
> 本文档记录已确认的未完成清单与分阶段执行计划。

---

## 一、总体路线图

```
阶段 A  半成品代码补全（当前进行中，详见第三节）
阶段 B  后端公网化：Coze 生产部署验证（health / supabase-config / SSE 穿透实测）
阶段 C  安卓 APK：本地 gradle 构建（prebuild + 签名 + assembleRelease）→ 真机联调
阶段 D  交付：签名 release APK + 安装说明
```

**已确认的架构决策**

| 决策项 | 结论 |
| --- | --- |
| 后端部署 | 继续使用 Coze 生产部署 |
| 目标平台 | 仅安卓 APK |
| AI 接入 | 保留 Coze SDK（豆包 doubao-seed）现状 |
| 数据库 | 继续 Supabase 云服务 |
| 发布形态 | APK 安装包直装分发 |
| APK 构建 | 本地 gradle 构建（Java 17 已就绪，需补装 Android SDK） |

---

## 二、未完成代码盘点

### A. 空文件 / 空文档

| 位置 | 现状 |
| --- | --- |
| `tsconfig.json`（仓库根） | 内容只有 `{}`，纯占位 |
| `server/src/storage/database/shared/relations.ts` | 空壳：空 import，未定义任何关系（死代码） |

### B. 用户可见的「开发中」stub

| 位置 | 现状 |
| --- | --- |
| `client/screens/my-questions/index.tsx:133` | 分享按钮 → `Alert '分享功能开发中'` |
| `client/screens/question-detail/index.tsx:238` | 编辑按钮 → `Alert '编辑功能开发中'` |
| `client/screens/question-detail/index.tsx:249` | 分享按钮 → `Alert '分享功能开发中'` |

### C. 写了一半 / 有缺陷的逻辑

**前端：**

1. **聊天无流式**：后端 SSE 端点（`/chat/:user_id/stream`）完整可用，`react-native-sse` 已装未用，前端为阻塞式单次请求
2. **计划时长无效**：`client/utils/api.ts:227` 的 `generate()` 中 `_duration` 参数被丢弃，时长选择（7/14/30/60 天）毫无作用
3. **联网题目详情打不开**：`client/screens/search/index.tsx:125` 将网络来源题目 push 到 `/question-detail`，但该 id 不在数据库 → 详情页 404

**后端：**

4. **账号关联断裂（最大半成品）**：`server/src/routes/users.ts` 创建用户时忽略客户端传入的 id，Supabase 登录账号与业务用户永远对不上；后端无任何鉴权中间件，`user_id` 参数被完全信任；`api.ts` 不携带任何 token
5. **长期计划残废**：`plans.ts` 中 long_term 计划创建即 `is_active: false`，且今日任务/逾期/迁移三个接口硬编码 `plan_type='daily'` → 长期计划只能看不能跟进
6. **删除污染**：`questions.ts DELETE /:id` 删共享题会连带删掉**所有用户**的错题关联记录
7. **评分逻辑分裂**：`search.ts /rate` 直接覆盖 rating，`questions.ts /:id/rate` 为增量平均
8. 其他：`is_onboarded: true` 硬编码；`index.ts` 无通用错误处理 / 404 handler

### D. 建了没用的死代码

| 项 | 说明 |
| --- | --- |
| `client/components/SmartDateInput.tsx` | 203 行完整日期选择组件，零引用 |
| `client/utils/index.ts` | `buildAssetUrl`、`convertToLocalTimeStr` 未使用 |
| 未使用依赖 | `react-native-sse`（将启用）、expo-av / chart-kit / webview / slider / picker 等 |
| heroui 组件库 | 整套 vendored 组件挂了 Provider 但无页面使用 |
| server 端 | dayjs / uuid / pg / drizzle-zod 等零引用；Drizzle schema 运行时不使用 |
| `server/scripts/parse_pdf.mjs` | 硬编码带签名下载 URL（**已随仓库公开，属凭证泄露，需移除**）；`import_qbank.ts` 硬编码 Linux `/tmp` 路径 |

---

## 三、本轮补全计划（已确认执行）

> 已确认决策：**编辑+分享都实现**；**长期计划补齐跟进能力**；**鉴权与账号关联纳入本轮**。

### 阶段 1：鉴权与账号关联（地基，最先做）

**后端**
- [x] 新增 `requireAuth` 中间件：读取 `x-session`（兼容 `Authorization: Bearer`）→ `supabase.auth.getUser(token)` 校验 → 挂 `req.authUserId`，失败返回 401；挂载到全部业务路由（`health`、`supabase-config` 豁免）
- [x] 全部 6 个路由文件将信任的 `user_id` 参数替换为 `req.authUserId`（URL 参数仅保留兼容，不再采信）
- [x] `users.ts POST`：insert 时写入 `id = authUid`（业务用户主键对齐 Supabase auth uid）；`is_onboarded` 按实际数据写入
- [x] 修复删除污染：`DELETE /questions/:id` 只删自己的 `user_questions` 关联；云端题仅 `created_by` 本人可删
- [x] 统一评分逻辑：`search /rate` 改为增量平均
- [x] `index.ts` 补通用错误处理 + 404 handler

**前端**
- [x] `api.ts`：模块级 token 注入（`setApiAuthToken()`），`request()` 自动携带 `x-session`
- [x] `AuthContext`：登录态变化时同步 token 给 api 层；移除 `@ts-nocheck` 修复类型
- [x] `UserContext`：业务用户按 auth uid 查找/创建；`app/index.tsx` 门控改为**登录 → onboarding → 主界面**三段式
- [ ] 运维动作（Supabase 后台）：关闭「Confirm email」，否则注册后拿不到 session

### 阶段 2：长期计划跟进

- [x] `plans.ts`：long_term 创建时 `is_active: true`；互斥下线逻辑仅作用于 daily 之间
- [x] `/today`、`/overdue`、`/move-overdue` 去掉 `plan_type='daily'` 硬编码，改为查询用户**所有活跃计划**的任务；响应携带 `plan_title`
- [x] 前端 home 任务卡片显示所属计划名

### 阶段 3：编辑 + 分享

- [x] 后端新增 `PUT /api/v1/questions/:id`：更新题目字段 + 本人 `user_questions`（wrong_answer / error_analysis）
- [x] 新增 `/question-edit` 路由 + 编辑页（表单预填，标签编辑复用 question-entry 交互模式）
- [x] 分享：RN 内置 `Share.share` 文本摘要（题干+答案+错因），零新依赖；my-questions 与 question-detail 共用工具函数

### 阶段 4：聊天 SSE 流式

- [x] chat 页接入 `react-native-sse`（支持 POST + body），流式追加助手消息 + 输入中指示器；失败自动降级阻塞接口
- [x] 风险预案：若真机 POST 流异常，改用 `expo/fetch` 手动解析流

### 阶段 5：计划时长生效 + 联网题详情

- [x] `/plans/generate` 接收 `duration_days`，写入 prompt 并约束起止日期与任务数；前端真正传递已选时长
- [x] 检索页网络来源题目：通过 `useSafeRouter` 的 Base64 payload 直传整题数据给 question-detail（展示模式，隐藏删除等操作）

### 阶段 6：空文档与死代码清理

- [x] 根 `tsconfig.json` 写入正经的 monorepo 基础配置
- [x] 删除 Drizzle 死栈（schema.ts / relations.ts / drizzle-orm / drizzle-kit / drizzle-zod / pg 等零引用依赖）
- [x] `parse_pdf.mjs` 硬编码签名 URL 移除，改为参数/环境变量传入
- [x] `depcheck` 核实后清理未用依赖
- [x] `SmartDateInput` 接入 my-plans / plan-detail / home 的日期输入

### 阶段 7：验证与文档

- [x] 每阶段执行 `pnpm -w lint:all`（server tsc ✓ / client tsc+eslint ✓）
- [ ] 后端接口 curl + 真实 Supabase token 冒烟（待提供 `COZE_SUPABASE_URL` / `COZE_SUPABASE_ANON_KEY`，或在 Coze dev 环境运行）
- [x] 更新 `PROJECT_DOC.md`（鉴权说明、新端点、编辑/分享功能）

> ⚠️ **数据迁移注意**：业务用户主键改为 auth uid 后，现有测试数据（旧 user id 关联的错题/计划）会失联。开发阶段默认接受重新开始；如需保留数据，需先写迁移脚本。

---

## 四、后续阶段（APK 集成，待补全完成后启动）

1. **Coze 生产部署验证**：部署后端 → 记录生产公网 URL → 验证 `health` / `supabase-config` / SSE 是否被网关缓冲
2. **构建环境**：安装 Android SDK（Android Studio 或 commandline-tools，compileSdk 36）→ 配置 `JAVA_HOME` / `ANDROID_HOME` → keytool 生成 keystore（不入 git）
3. **客户端配置**：固定 `android.package`（现为 `com.anonymous.x...` 占位）与 app 名「知途」→ `EXPO_PUBLIC_BACKEND_BASE_URL` 指向生产 URL → `expo prebuild --platform android`
4. **构建**：`gradlew assembleRelease` 出 APK → 真机全流程回归（相机权限、上传、SSE）
5. **交付**：签名 release APK + 安装说明
