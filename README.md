# BlogWriter - 极简 Hexo 博客管理器

<div align="center">

![Version](https://img.shields.io/badge/version-1.1.0-black.svg)
![License](https://img.shields.io/badge/license-MIT-black.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-black.svg)
![Svelte](https://img.shields.io/badge/Svelte-4.2.19-black.svg)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers%20%26%20Pages-black.svg)

基于 **Cloudflare Workers + Svelte** 构建的极简高质感 Hexo 博客管理与移动端写作工具。

[在线体验](https://writer.qwqc.cc) • [功能特性](#-功能特性) • [快速开始](#-快速开始) • [部署指南](#-部署说明) • [API 文档](#-api-文档)

</div>

---

## 🌐 在线演示

- **前端应用 (Cloudflare Pages)**: [https://writer.qwqc.cc](https://writer.qwqc.cc)
- **后端服务 (Cloudflare Workers)**: [https://writer-api.qwqc.cc](https://writer-api.qwqc.cc)

---

## 📖 项目简介

**BlogWriter** 专为 Hexo 静态博客打造，提供现代出版物（Medium / Notion 风格）的高对比黑白极简界面与沉浸式文稿编辑体验。

无论是在手机、平板还是桌面端，您都可以直连 GitHub 仓库随心撰写、管理博文，享受秒级图片上传（支持 GitHub 仓库图床与 S3 / R2 云存储）、本地草稿实时保护以及 PWA 离线安装体验。

---

## ✨ 核心优势

- 🖤 **极简黑白出版物设计** - 告别臃肿后台，采用 Medium / Notion 风格的纯净排版与高对比文字，提供纸质文稿般的专注体验。
- 📱 **移动端原生级调校** - 适配 iOS 底部安全区，配备经视口与键盘高度精准补偿的**悬浮快捷输入栏**，大触控热区无误触。
- 🔐 **GitHub 直连与零数据中转** - 基于 GitHub OAuth 2.0 授权，文章增删改查直连个人仓库，无第三方数据库存储用户隐私。
- 🖼️ **双模图床系统**：
  - **GitHub 博客仓库图床（推荐）**：零额外成本，按年月自动归档至 `source/images/YYYY/MM/xxx.png`，网站生成即生效。
  - **S3 / R2 兼容云存储**：支持 Cloudflare R2、AWS S3、阿里云 OSS、腾讯云 COS、七牛云、MinIO 等。
  - **秒级上传与撤回**：支持拖拽/剪贴板粘贴直传、实时进度显示与 30 秒内一键撤回删除。
- 🛡️ **本地草稿与状态保全** - 30 秒自动暂存浏览器本地，意外刷新或关闭可一键恢复草稿。
- ⚡ **全球边缘低延迟与零服务器成本** - 前端部署在 Cloudflare Pages，API 运行在 Cloudflare Workers，享受全球边缘网络与免费额度。
- 📲 **PWA 桌面/移动端安装** - 支持添加至手机主屏幕或桌面端独立运行，支持离线缓存与应用更新自动提醒。
- 🔄 **跨设备一键配置同步** - 支持仓库与图床配置的 Base64 编码导出与一键导入。

---

## 🎯 功能特性

### 1. 文章管理
- ✅ **文章列表**：流式排版展示所有博文，支持文件名/发布日期/文件体积清晰展示。
- ✅ **创建与编辑**：无边框文稿大标题设计，搭配 Ace Editor Markdown 语法高亮与流畅排版。
- ✅ **删除确认**：极简毛玻璃二次确认弹窗，防止误删线上文章。
- ✅ **Hexo 格式兼容**：自动解析与保持 Front-Matter 头部元数据（Title、Date、Tags、Categories 等）。

### 2. 写作与编辑器
- 🎨 **语法高亮与排版**：Markdown 语法实时着色与换行自适应。
- 📋 **图片粘贴秒传**：支持截屏后直接 `Ctrl/Cmd + V` 粘贴上传插入。
- 🖱️ **图片拖拽上传**：拖拽图片进入编辑器区域自动触发上传。
- ⌨️ **快捷键支持**：支持 `Ctrl/Cmd + S` 快捷保存、标准 Markdown 标记包裹。
- 📱 **移动端键盘快捷栏**：集成 `#`、`**`、`*`、`` ` ``、`代码块`、`链接`、`图片`、`列表`、`引用`、`删除线`、`分割线` 以及 iOS 专用粘贴/选图辅助。

### 3. 图床存储
- 📦 **GitHub 仓库图床**：无需额外配置第三方存储桶，随博客源码一同版本管理。
- ☁️ **S3 兼容存储**：预设主流服务商端点，支持自定义 Endpoint、Bucket、CDN 域名、路径前缀与图片处理后缀。
- ⏱️ **30s 撤回删除**：上传后弹出极简黑底胶囊，30 秒内点击「撤回」可自动清除编辑器 Markdown 并从远程存储删除图片。

---

## 🛠️ 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                    BlogWriter 前端应用                       │
│       Svelte 4 + Tailwind CSS + Ace Editor + Vite (PWA)     │
│                 (部署于 Cloudflare Pages)                    │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
        GitHub OAuth / API              S3 上传 / 删除
                │                             │
┌───────────────▼─────────────────────────────▼───────────────┐
│                 BlogWriter 后端 API 服务                     │
│               Cloudflare Workers + KV 存储                  │
│       (处理 OAuth 鉴权、GitHub 代理交互、S3 SigV4 签名)       │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
    ┌───────────▼───────────┐     ┌───────────▼───────────┐
    │     GitHub REST API   │     │  Cloudflare R2 / S3   │
    │  (用户 Hexo 博客仓库)  │     │       (云存储图床)     │
    └───────────────────────┘     └───────────────────────┘
```

---

## 🚀 快速开始

### 前置准备
- Node.js 18+
- GitHub 账号
- Cloudflare 账号（已安装 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)）

### 1. 本地克隆与依赖安装

```bash
git clone https://github.com/lukelzlz/blogwriter.git
cd blogwriter

npm install
```

### 2. 创建 GitHub OAuth App

前往 [GitHub Developer Settings -> OAuth Apps](https://github.com/settings/developers) 创建应用：

- **Application name**: `BlogWriter`
- **Homepage URL**: `https://writer.qwqc.cc`（或你的前端 Pages 域名）
- **Authorization callback URL**: `https://writer-api.qwqc.cc/auth/callback`（或你的 Worker API 域名 `/auth/callback`）

保存生成的 `Client ID` 与 `Client Secret`。

### 3. 配置 Cloudflare KV 命名空间

创建用于保存用户 OAuth Session 的 KV 命名空间：

```bash
npx wrangler kv:namespace create SESSIONS
```

将返回的 `id` 填入 `wrangler.toml` 中的 `kv_namespaces` 配置项。

### 4. 配置环境变量与密钥

修改 `wrangler.toml`：

```toml
name = "blogwriter"
main = "src/worker/index.ts"
compatibility_date = "2026-01-01"

[[kv_namespaces]]
binding = "SESSIONS"
id = "你的_KV_NAMESPACE_ID"

[vars]
GITHUB_CLIENT_ID = "你的_GITHUB_CLIENT_ID"
GITHUB_REDIRECT_URI = "https://你的_API_域名/auth/callback"
FRONTEND_URL = "https://你的_前端_域名"
```

设置 Client Secret 安全变量：

```bash
npx wrangler secret put GITHUB_CLIENT_SECRET
# 输入你的 GitHub Client Secret
```

### 5. 本地开发调试

```bash
# 终端 1：启动前端开发服务
npm run dev

# 终端 2：启动 Worker 本地服务
npm run wrangler:dev
```

打开浏览器访问 `http://localhost:5173`。

---

## 🚢 部署说明

### 一键构建与部署

项目内置了自动化部署脚本：

```bash
bash builddeploy.sh
```

### 分步手动部署

```bash
# 1. 部署后端 Worker API 服务
npm run deploy:worker

# 2. 构建前端静态资源与 PWA ServiceWorker
npm run build

# 3. 部署前端至 Cloudflare Pages
npm run deploy:pages
```

---

## 📁 目录结构

```
blogwriter/
├── src/
│   ├── worker/                  # Cloudflare Workers 后端
│   │   ├── index.ts             # Worker 路由分发入口
│   │   ├── auth.ts              # GitHub OAuth 鉴权与 Session 管理
│   │   ├── github.ts            # GitHub Contents / Repos API 封装
│   │   ├── posts.ts             # Hexo 文章增删改查核心逻辑
│   │   └── upload.ts            # S3 / GitHub 图床上传及删除 (AWS SigV4)
│   ├── app/                     # Svelte 4 响应式前端
│   │   ├── components/          # UI 组件库
│   │   │   ├── Header.svelte         # 磨砂极简吸顶导航栏
│   │   │   ├── MarkdownEditor.svelte # Ace 编辑器与移动端直角快捷栏
│   │   │   ├── PostList.svelte       # Medium 风格文章流与删除弹窗
│   │   │   ├── LoginButton.svelte    # 黑白高质感 GitHub 登录按钮
│   │   │   └── PreviewPane.svelte    # 渲染预览容器
│   │   ├── routes/              # 页面视图
│   │   │   ├── +page.svelte          # 首页 / 文章列表 / 未登录 Landing
│   │   │   ├── new/+page.svelte      # 纸质文稿新建文章页
│   │   │   ├── edit/[slug]/+page.svelte # 文章编辑与草稿恢复页
│   │   │   └── settings/+page.svelte # 仓库配置 / 图床服务 / 导入导出
│   │   ├── stores/              # 状态管理 (auth, editor, posts)
│   │   ├── lib/                 # API 封装、Hexo 解析器、S3 服务商预设、PWA 控制器
│   │   ├── App.svelte           # 顶层布局容器与全局路由分发
│   │   ├── app.css              # 全局排版、微动画与编辑器样式覆盖
│   │   └── main.ts              # Svelte 挂载入口
│   └── shared/                  # 前后端共享 TypeScript 类型
├── public/                      # 黑白极简 PWA 图标与 Manifest 静态资源
├── wrangler.toml                # Cloudflare Workers 部署配置
├── vite.config.ts               # Vite 5 & PWA 生产构建配置
├── tailwind.config.js           # 极简黑白单色调与字距扩展
├── builddeploy.sh               # 一键打包与双端发布脚本
└── README.md
```

---

## 🔌 API 文档

### 认证接口 (Auth)
| 方法 | 路径 | 描述 |
| :--- | :--- | :--- |
| `GET` | `/auth/github` | 获取 GitHub OAuth 授权跳转 URL |
| `GET` | `/auth/callback` | 处理 OAuth 回调，换取 Token 并建立 Session |
| `GET` | `/auth/user` | 获取当前已认证的用户基本信息 |
| `POST` | `/auth/logout` | 销毁当前会话 Session |

### 文章接口 (Posts)
| 方法 | 路径 | 描述 |
| :--- | :--- | :--- |
| `GET` | `/api/posts` | 获取指定仓库与路径下的 Hexo 文章列表 |
| `GET` | `/api/posts/:path` | 获取单篇文章正文与 Front-Matter 元信息 |
| `POST` | `/api/posts` | 创建并提交新文章至 GitHub 仓库 |
| `PUT` | `/api/posts/:path` | 更新现有文章内容并更新 SHA |
| `DELETE` | `/api/posts/:path` | 从 GitHub 仓库删除指定文章 |

### 图床与上传接口 (Upload)
| 方法 | 路径 | 描述 |
| :--- | :--- | :--- |
| `POST` | `/api/upload` | 上传图片（支持 GitHub 仓库写入或 S3 存储桶直传） |
| `POST` | `/api/upload/delete` | 撤回删除已上传的图片文件 |

---

## 📄 开源许可证

本项目基于 [MIT 许可证](LICENSE) 开源。
