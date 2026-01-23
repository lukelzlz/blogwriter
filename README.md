# Hexo 博客管理器

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![Svelte](https://img.shields.io/badge/Svelte-4.2.19-orange.svg)

一个基于 Cloudflare Workers 和 Svelte 的 Hexo 博客管理工具，让您可以在移动设备上轻松管理您的 Hexo 博客。

[功能特性](#功能特性) • [快速开始](#快速开始) • [文档](#文档) • [在线演示](#在线演示)

</div>

## 🌐 在线演示

- **前端应用**: [https://writer.qwqc.cc](https://writer.qwqc.cc)
- **API 服务**: [https://writer-api.qwqc.cc](https://writer-api.qwqc.cc)

## 📖 简介

Hexo 博客管理器是一个现代化的博客管理工具，专为 Hexo 静态博客框架设计。它提供了一个优雅的 Web 界面，让您可以在任何设备上（包括移动设备）轻松创建、编辑和管理您的博客文章。

### ✨ 核心优势

- 🚀 **零服务器成本** - 部署在 Cloudflare Workers，享受免费额度
- 📱 **移动端优先** - 专为移动设备优化的响应式设计
- 🔐 **安全可靠** - 使用 GitHub OAuth 2.0 认证，数据存储在您的仓库
- ⚡ **全球加速** - Cloudflare 边缘网络，全球访问极速响应
- 📝 **强大编辑器** - 基于 Ace Editor 的 Markdown 编辑器，支持实时预览
- 🔄 **自动保存** - 本地自动保存，防止意外丢失
- 🖼️ **图片上传** - 支持多种 S3 兼容存储（AWS、阿里云、腾讯云等）
- 📲 **PWA 支持** - 可安装到桌面，支持离线访问

## 🎯 功能特性

### 核心功能

- ✅ **GitHub OAuth 认证** - 安全的 GitHub 账户登录和授权
- ✅ **文章管理** - 创建、编辑、删除文章
- ✅ **Markdown 编辑器** - 基于 Ace Editor 的强大编辑器
- ✅ **实时预览** - 即时查看 Markdown 渲染效果
- ✅ **自动保存** - 本地自动保存，手动提交到 GitHub
- ✅ **Hexo 优化** - 自动生成 front-matter 和格式化文件名
- ✅ **移动端友好** - 响应式设计，完美支持移动设备
- ✅ **离线编辑** - 支持本地草稿恢复
- ✅ **PWA 支持** - 可安装到桌面，支持离线访问
- ✅ **图片上传** - 支持拖拽上传和粘贴上传图片
- ✅ **S3 兼容存储** - 支持 AWS S3、阿里云 OSS、腾讯云 COS、七牛云、Cloudflare R2 等

### 编辑器功能

- 🎨 **语法高亮** - Markdown 语法实时高亮
- 🔍 **搜索替换** - 快速查找和替换文本
- 📋 **剪贴板支持** - 支持粘贴图片自动上传
- 🖱️ **拖拽上传** - 拖拽图片到编辑器自动上传
- ⌨️ **快捷键支持** - 常用 Markdown 语法快捷键
- 📱 **移动端快捷栏** - 专为移动端设计的快捷输入工具

### 存储功能

- 📦 **多种云存储** - 支持 8+ 种 S3 兼容存储服务
- 🗂️ **路径前缀** - 支持自定义存储路径
- 🌐 **CDN 支持** - 支持自定义 CDN 域名
- 📊 **上传进度** - 实时显示上传进度
- ↩️ **撤回功能** - 上传后 30 秒内可撤回删除

## 🛠️ 技术栈

### 后端

- **Cloudflare Workers** - 边缘计算平台
- **TypeScript** - 类型安全的 JavaScript
- **GitHub REST API** - GitHub 仓库操作
- **GitHub OAuth 2.0** - 用户认证
- **Cloudflare KV** - 会话存储
- **AWS Signature V4** - S3 兼容存储签名

### 前端

- **Svelte 4** - 现代化的前端框架
- **Tailwind CSS** - 实用优先的 CSS 框架
- **Ace Editor** - 强大的代码编辑器
- **marked.js** - Markdown 解析和渲染
- **Vite** - 快速的构建工具
- **vite-plugin-pwa** - PWA 支持

### 存储

- **Cloudflare KV** - 会话管理
- **localStorage** - 草稿存储
- **S3 兼容存储** - 图片存储

## 🚀 快速开始

### 前置要求

- Node.js 18+
- npm 或 yarn
- Cloudflare 账户
- GitHub 账户

### 安装

```bash
# 克隆仓库
git clone https://github.com/your-username/blogwriter.git
cd blogwriter

# 安装依赖
npm install
```

### 配置

#### 1. 创建 GitHub OAuth App

访问 [GitHub Developer Settings](https://github.com/settings/developers) 创建新的 OAuth App：

- **Application name**: `Hexo Blog Manager`
- **Homepage URL**: `https://your-domain.workers.dev`
- **Authorization callback URL**: `https://your-api-domain.workers.dev/auth/callback`

记录下 `Client ID` 和 `Client Secret`。

#### 2. 创建 Cloudflare KV Namespace

```bash
npx wrangler kv:namespace create SESSIONS
```

记录下输出的 `id` 值。

#### 3. 配置 wrangler.toml

更新 `wrangler.toml` 中的配置：

```toml
[[kv_namespaces]]
binding = "SESSIONS"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-namespace-id"

[vars]
GITHUB_CLIENT_ID = "your-github-client-id"
GITHUB_REDIRECT_URI = "https://your-api-domain.workers.dev/auth/callback"
```

#### 4. 设置 GitHub Client Secret

```bash
npx wrangler secret put GITHUB_CLIENT_SECRET
```

粘贴您的 GitHub Client Secret 并按回车。

### 开发

```bash
# 启动前端开发服务器
npm run dev

# 启动 Workers 开发服务器（另一个终端）
npm run wrangler:dev
```

访问 `http://localhost:5173` 查看前端。

### 部署

```bash
# 登录 Cloudflare
npx wrangler login

# 部署 Worker（API 服务）
wrangler deploy
# 或
npm run deploy:worker

# 构建前端
npm run build

# 部署 Pages（前端）
npm run deploy:pages
# 或
npm run deploy
```

### 快速部署

使用项目提供的部署脚本一键完成所有部署步骤：

```bash
bash builddeploy.sh
```

该脚本会按顺序执行：
1. 部署 Worker（API 服务）
2. 构建前端
3. 部署 Pages（前端）

## 📚 文档

- [部署指南](docs/DEPLOYMENT.md) - 详细的部署步骤和配置说明
- [使用说明](docs/USAGE.md) - 完整的使用教程和功能介绍
- [技术方案](plans/hexo-blog-manager-plan.md) - 项目架构和设计思路

## 💡 使用说明

### 登录

1. 点击"使用 GitHub 登录"按钮
2. 授权应用访问您的 GitHub 仓库
3. 登录成功后，您可以开始管理博客

### 创建文章

1. 点击"新建文章"
2. 输入文章标题
3. 使用 Markdown 编辑器编写内容
4. 实时预览渲染效果
5. 点击"保存"按钮提交到 GitHub

### 编辑文章

1. 在文章列表中点击编辑按钮
2. 修改内容
3. 点击"保存"按钮更新文章

### 图片上传

1. 在编辑器中拖拽图片
2. 或粘贴图片（Ctrl/Cmd + V）
3. 图片自动上传到配置的 S3 存储
4. 自动插入 Markdown 图片语法

### 自动保存

- 编辑器会每 30 秒自动保存到浏览器本地存储
- 失去焦点时也会自动保存
- 只有点击"保存"按钮才会提交到 GitHub
- 下次打开时会提示恢复未保存的草稿

## 📁 项目结构

```
blogwriter/
├── src/
│   ├── worker/              # Cloudflare Workers 后端
│   │   ├── index.ts         # Worker 入口，路由分发
│   │   ├── auth.ts          # GitHub OAuth 认证逻辑
│   │   ├── github.ts        # GitHub API 封装
│   │   ├── posts.ts         # 文章 CRUD 操作
│   │   └── upload.ts        # S3 图片上传（AWS Signature V4）
│   ├── app/                 # Svelte 前端
│   │   ├── components/      # UI 组件
│   │   │   ├── Header.svelte
│   │   │   ├── MarkdownEditor.svelte
│   │   │   ├── PreviewPane.svelte
│   │   │   ├── PostList.svelte
│   │   │   └── LoginButton.svelte
│   │   ├── routes/          # 页面路由
│   │   │   ├── +page.svelte         # 首页（文章列表）
│   │   │   ├── login/+page.svelte   # 登录页
│   │   │   ├── new/+page.svelte     # 新建文章
│   │   │   ├── edit/[slug]/+page.svelte  # 编辑文章
│   │   │   └── settings/+page.svelte # 设置页（S3 配置）
│   │   ├── stores/          # Svelte stores
│   │   │   ├── auth.ts      # 认证状态管理
│   │   │   ├── editor.ts    # 编辑器状态管理
│   │   │   └── posts.ts     # 文章列表状态
│   │   ├── lib/             # 工具函数
│   │   │   ├── api.ts       # API 请求封装
│   │   │   ├── hexo.ts      # Hexo 相关工具
│   │   │   ├── pwa.ts       # PWA 更新检测
│   │   │   ├── s3-presets.ts # S3 服务商预设
│   │   │   └── utils.ts     # 通用工具函数
│   │   ├── App.svelte       # 主应用组件（路由）
│   │   ├── main.ts          # 应用入口
│   │   └── app.css          # 全局样式
│   └── shared/              # 共享类型定义
│       └── types.ts         # TypeScript 类型
├── docs/                    # 文档
│   ├── DEPLOYMENT.md
│   └── USAGE.md
├── plans/                   # 计划文档
│   ├── hexo-blog-manager-plan.md
│   └── image-upload-s3.md
├── public/                  # 静态资源（PWA 图标）
│   ├── favicon.ico
│   ├── pwa-64x64.png
│   ├── pwa-192x192.png
│   └── pwa-512x512.png
├── wrangler.toml            # Cloudflare Workers 配置
├── vite.config.ts           # Vite 配置（含 PWA）
├── package.json             # 项目依赖
├── tsconfig.json            # TypeScript 配置
├── tailwind.config.js       # Tailwind CSS 配置
├── README.md                # 项目说明
├── CHANGELOG.md             # 更新日志
└── LICENSE                  # MIT 许可证
```

## 🔌 API 文档

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/auth/github` | 获取 GitHub OAuth 授权 URL |
| GET | `/auth/callback` | OAuth 回调处理 |
| GET | `/auth/user` | 获取当前用户信息 |
| POST | `/auth/logout` | 登出 |

### 文章管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/posts` | 获取文章列表 |
| GET | `/api/posts/:path` | 获取文章详情 |
| POST | `/api/posts` | 创建新文章 |
| PUT | `/api/posts/:path` | 更新文章 |
| DELETE | `/api/posts/:path` | 删除文章 |

### 仓库管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/repo` | 获取仓库信息 |
| GET | `/api/repo/branches` | 获取分支列表 |

### 图片上传

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/upload` | 上传图片到 S3 存储 |
| POST | `/api/upload/delete` | 删除 S3 存储中的图片 |

## ⚙️ 环境变量

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID | 是 |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret | 是 |
| `GITHUB_REDIRECT_URI` | OAuth 回调 URL | 是 |

### S3 配置（用户级）

在设置页面配置图片上传的 S3 存储：

| 配置项 | 说明 |
|--------|------|
| `provider` | 服务商标识（aws, aliyun, tencent, qiniu, r2, minio, custom） |
| `endpoint` | S3 endpoint URL |
| `region` | 区域 |
| `accessKeyId` | Access Key ID |
| `secretAccessKey` | Secret Access Key |
| `bucket` | 存储桶名称 |
| `publicUrl` | 公开访问 URL 前缀（CDN 域名） |
| `pathPrefix` | 路径前缀，如 blog/images |
| `forcePathStyle` | 是否使用路径风格（MinIO 等需要） |
| `urlSuffix` | URL 后缀，如 -ys（用于 CDN 图片处理样式） |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

### 开发流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 代码规范

- 使用 TypeScript 进行类型检查
- 遵循 ESLint 规则
- 编写清晰的提交信息
- 添加必要的注释

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 🙏 致谢

- [Svelte](https://svelte.dev/) - 现代化的前端框架
- [Cloudflare Workers](https://workers.cloudflare.com/) - 边缘计算平台
- [Ace Editor](https://ace.c9.io/) - 强大的代码编辑器
- [Tailwind CSS](https://tailwindcss.com/) - 实用优先的 CSS 框架
- [Hexo](https://hexo.io/) - 快速、简洁且高效的博客框架
- [marked.js](https://marked.js.org/) - Markdown 解析器

## 📞 支持

如有问题，请：

- 提交 [GitHub Issue](https://github.com/lukelzlz/blogwriter/issues)
- 查看 [文档](docs/)
- 联系维护者

## 🌟 Star History

如果这个项目对您有帮助，请给我们一个 Star ⭐️

---

<div align="center">

Made with ❤️ for Hexo bloggers

[⬆ 回到顶部](#hexo-博客管理器)

</div>
