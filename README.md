# Expo App + Express.js

一个基于 **Expo + React Native + Express.js** 的全栈 Monorepo 项目模板。

* 前端：Expo / React Native
* 路由：Expo Router
* 后端：Express.js
* 包管理：pnpm workspace
* 样式：Tailwind CSS + Uniwind

---

## 目录结构规范（严格遵循）

当前仓库是一个 Monorepo，基于 pnpm workspace。

### 核心规则

* Expo / React Native 代码放在 `client/` 目录
* Express.js 代码放在 `server/` 目录
* `client/app/` **仅用于 Expo Router 路由配置**
* 页面具体实现放在 `client/screens/`
* 可复用组件放在 `client/components/`
* 页面容器必须使用 `client/components/Screen.tsx`
* 本模板默认无 Tab Bar，可按需改造成 Tabs 导航
* `.cozeproj` 和 `.coze` 为项目预置文件，**禁止修改**

### 项目结构

```text
├── client/                     # React Native 前端代码
│   ├── app/                    # Expo Router 路由目录（仅路由配置）
│   │   ├── _layout.tsx         # 根布局文件（必需，务必阅读）
│   │   └── index.tsx           # 首页
│   ├── screens/                # 页面实现目录（与 app/ 路由对应）
│   │   └── demo/               # 示例页面
│   │       └── index.tsx
│   ├── components/             # 可复用组件
│   │   └── Screen.tsx          # 页面容器组件（必用）
│   ├── hooks/                  # 自定义 Hooks
│   ├── contexts/               # React Context
│   ├── utils/                  # 工具函数
│   ├── assets/                 # 静态资源
│   └── package.json            # Expo 应用 package.json
│
├── server/                     # Express.js 服务端代码
│   ├── src/
│   │   └── index.ts            # 服务端入口文件
│   └── package.json            # Express 应用 package.json
│
├── package.json                # Monorepo 根 package.json
├── .cozeproj                   # 预置脚手架脚本（禁止修改）
└── .coze                       # 配置文件（禁止修改）
```

---

## 样式方案

项目基于 **Tailwind CSS** 进行样式开发，底层使用 **Uniwind**。

### 基本用法

```tsx
<View className="flex-1 bg-white dark:bg-gray-900 p-4">
  {/* 页面内容 */}
</View>
```

```tsx
<Text
  className="text-lg font-bold text-gray-900 dark:text-white"
  selectionColorClassName="accent-blue-500"
>
  Hello World
</Text>
```

Uniwind 官方文档：

[Uniwind Documentation](https://docs.uniwind.dev/llms.txt)

---

## 静态校验（TSC + ESLint）

项目提供以下静态检查命令。

### 检查 client 和 server

```bash
pnpm -w lint:all
```

### 仅检查 client

```bash
pnpm -w lint:client
```

### 仅检查 server

```bash
pnpm -w lint:server
```

修改代码后，应运行对应的静态检查，确保 TypeScript 和 ESLint 检查通过。

---

## 主题模式

项目默认**跟随系统主题**。

如果用户明确指定使用固定的暗色或亮色主题，需要修改：

```text
client/components/ColorSchemeUpdater.tsx
```

中的：

```ts
DEFAULT_THEME
```

变量。

支持：

* 跟随系统
* 固定暗色
* 固定亮色

除非任务明确要求，否则不要绕过项目现有的主题管理逻辑。

---

## 自定义主题 Design Tokens

项目的设计系统基于 Tailwind CSS 实现。

主题 Design Tokens 的核心入口文件为：

```text
client/global.css
```

如果需要修改主题相关内容，例如：

* 颜色
* 背景
* 边框
* Design Tokens
* Light / Dark Theme

应先阅读并修改：

```text
client/global.css
```

不要在各个页面中重复定义全局 Design Tokens。

---

# 路由及 Tab Bar 实现规范

项目使用 **Expo Router** 管理路由。

根据项目需求，可以采用以下两种方案。

---

## 方案一：无 Tab Bar（Stack 导航）

适用于线性流程应用。

### 目录结构

```text
client/app/
├── _layout.tsx         # 根布局（Stack 导航配置）
├── index.tsx           # 应用入口
├── detail.tsx          # 详情页（通过 params 传递数据）
└── +not-found.tsx      # 404 页面
```

### 根布局配置

文件：

```text
client/app/_layout.tsx
```

以下代码仅作为写法参考：

```tsx
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="index" />
  <Stack.Screen name="detail" />
</Stack>
```

### 应用入口

文件：

```text
client/app/index.tsx
```

```tsx
export { default } from "@/screens/home";
```

> ⚠️ **禁止事项：**
>
> 无 Tab Bar 场景下，不得创建 `(tabs)` 目录。

---

## 方案二：有 Tab Bar（Tabs 导航）

如果应用需要底部 Tab Bar，应使用 Expo Router 的路由分组。

### 目录结构

当前项目使用 4 个 Tab：

```text
client/app/
├── _layout.tsx              # 根布局
├── (tabs)/
│   ├── _layout.tsx          # Tab 导航配置
│   ├── index.tsx            # 首页
│   ├── search.tsx           # 检索
│   ├── profile.tsx          # 学情
│   └── chat.tsx             # 知途
├── detail.tsx               # Tab 外的独立页面
└── +not-found.tsx           # 404 页面
```

### ⚠️ 重要规则：删除 `app/index.tsx`

当项目使用：

```text
client/app/(tabs)/index.tsx
```

时，**必须删除：**

```text
client/app/index.tsx
```

不要同时保留两个入口。

否则 `app/index.tsx` 会优先于 `(tabs)/index.tsx`，导致首页无法正常进入 Tab 导航。

---

### 根布局配置

文件：

```text
client/app/_layout.tsx
```

以下代码仅作为写法参考：

```tsx
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="(tabs)" />
  <Stack.Screen name="detail" />
</Stack>
```

---

### Tab 页面

当前项目包含以下 Tab 页面：

| 路由文件          | Tab 名称 |
| ------------- | ------ |
| `index.tsx`   | 首页     |
| `search.tsx`  | 检索     |
| `profile.tsx` | 学情     |
| `chat.tsx`    | 知途     |

例如首页：

文件：

```text
client/app/(tabs)/index.tsx
```

```tsx
export { default } from "@/screens/home";
```

其他 Tab 页面同样应将具体页面实现放在 `screens/` 中，而不是直接在路由文件中编写大量页面逻辑。

---

### Tab 布局配置

文件：

```text
client/app/(tabs)/_layout.tsx
```

参考实现：

```tsx
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome6 } from "@expo/vector-icons";
import { useCSSVariable } from "uniwind";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  const [background, muted, accent, border] = useCSSVariable([
    "--color-background",
    "--color-muted",
    "--color-accent",
    "--color-border",
  ]) as string[];

  let tabBarStyle = {
    backgroundColor: background,
    borderTopWidth: 1,
    borderTopColor: border,
    paddingBottom: 8,
    paddingTop: 6,
    height: 70 + insets.bottom,
  };

  // 用于修复 Web 上高度异常的问题
  if (Platform.OS === "web") {
    tabBarStyle = {
      ...tabBarStyle,
      height: undefined as any,
    };
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: "#7B2D8E",
        tabBarInactiveTintColor: muted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
          marginTop: 2,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      {/* name 必须与文件名完全一致 */}
      <Tabs.Screen
        name="index"
        options={{
          title: "首页",
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="house" size={20} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="search"
        options={{
          title: "检索",
          tabBarIcon: ({ color }) => (
            <FontAwesome6
              name="magnifying-glass"
              size={20}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "学情",
          tabBarIcon: ({ color }) => (
            <FontAwesome6
              name="chart-line"
              size={20}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="chat"
        options={{
          title: "知途",
          tabBarIcon: ({ color }) => (
            <FontAwesome6
              name="comments"
              size={20}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
```

### Tab 配置注意事项

`Tabs.Screen` 中的：

```tsx
name
```

必须与对应的路由文件名完全一致。

例如：

```text
search.tsx
```

必须对应：

```tsx
<Tabs.Screen name="search" />
```

同理：

```text
profile.tsx
```

必须对应：

```tsx
<Tabs.Screen name="profile" />
```

以及：

```text
chat.tsx
```

必须对应：

```tsx
<Tabs.Screen name="chat" />
```

`useSafeAreaInsets()` 用于获取设备底部安全区域的边距。

当前 Tab Bar 使用：

```tsx
insets.bottom
```

计算 Tab Bar 高度，因此：

```tsx
const insets = useSafeAreaInsets();
```

**不要删除。**

---

# 注意事项

## 修改 `_layout.tsx` 前必须先阅读

在修改：

```text
client/app/_layout.tsx
```

之前，**必须先阅读该文件的现有内容**。

修改时必须保留项目原有的重要逻辑。

### 必须保留

* `global.css` 的引入
* Provider 的使用
* 项目已有的初始化逻辑
* 其他现有全局配置

除非任务明确要求，否则不要删除、覆盖或重构这些逻辑。

---

## 依赖管理与模块导入规范

### 依赖安装

**禁止使用 `npm` 或 `yarn`。**

根据代码所在目录使用对应的安装方式。

| 目录        | 安装命令                         | 说明                      |
| --------- | ---------------------------- | ----------------------- |
| `client/` | `npx expo install <package>` | Expo 会自动选择与当前 SDK 兼容的版本 |
| `server/` | `pnpm add <package>`         | 使用 pnpm 管理后端依赖          |

### Client

```bash
cd client
npx expo install expo-camera expo-image-picker
```

### Server

```bash
cd server
pnpm add axios cors
```

### 网络问题处理

如果 `npx expo install` 因网络原因失败：

1. 重试最多 2 次
2. 如果仍然失败，再使用 `pnpm add`
3. 不要改用 `npm install` 或 `yarn`

---

# Expo 开发规范

## 路径别名

项目已配置路径别名：

```text
@/
```

指向：

```text
client/
```

因此可以使用 `@/` 进行模块导入。

### 推荐

```tsx
import { Screen } from "@/components/Screen";
```

### 不推荐

```tsx
import { Screen } from "../../../components/Screen";
```

除非存在特殊原因，否则不要使用多层 `../` 进行跨目录导入。

---

## 页面实现规范

Expo Router 的：

```text
client/app/
```

主要用于路由配置。

页面具体实现应放在：

```text
client/screens/
```

例如：

```text
client/app/
└── detail.tsx

client/screens/
└── detail/
    └── index.tsx
```

路由文件：

```tsx
export { default } from "@/screens/detail";
```

页面实现：

```tsx
import { Screen } from "@/components/Screen";

export default function DetailScreen() {
  return (
    <Screen>
      {/* 页面内容 */}
    </Screen>
  );
}
```

---

# 开发原则

为了保持项目结构稳定，修改代码时应遵循以下原则：

1. **修改代码前先阅读相关现有文件。**
2. **尽量只修改完成任务所必需的文件。**
3. **不要随意改变项目目录结构。**
4. **优先复用已有的组件、Hooks、Context 和工具函数。**
5. **不要重复创建项目中已经存在的功能。**
6. **修改 `_layout.tsx` 前必须先阅读并保留现有 Provider 和全局初始化逻辑。**
7. **不要修改 `.cozeproj` 和 `.coze`。**
8. **新增依赖前先确认项目中是否已经存在相同或类似功能。**
9. **修改完成后运行对应的 TSC / ESLint 检查。**
10. **除非任务明确要求，不要对无关代码进行重构。**

---

# 本地开发

## 启动前后端

使用：

```bash
coze-dev dev
```

该命令用于：

* 首次启动前后端服务
* 重启前后端服务

执行时会先尝试清理占用相关端口的进程，然后启动服务。

---

# 快速参考

| 操作          | 命令 / 文件                                    |
| ----------- | ------------------------------------------ |
| 启动前后端       | `coze-dev dev`                             |
| 检查全部代码      | `pnpm -w lint:all`                         |
| 检查 Client   | `pnpm -w lint:client`                      |
| 检查 Server   | `pnpm -w lint:server`                      |
| Client 安装依赖 | `npx expo install <package>`               |
| Server 安装依赖 | `pnpm add <package>`                       |
| 全局主题        | `client/global.css`                        |
| 主题模式        | `client/components/ColorSchemeUpdater.tsx` |
| 路由配置        | `client/app/`                              |
| 页面实现        | `client/screens/`                          |
| 公共组件        | `client/components/`                       |
| Hooks       | `client/hooks/`                            |
| Context     | `client/contexts/`                         |
| 工具函数        | `client/utils/`                            |

```
```
