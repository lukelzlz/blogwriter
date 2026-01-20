# Hexo 博客管理器

一个基于 Cloudflare Workers 和 Svelte 的 Hexo 博客管理工具，让您可以在移动设备上轻松管理您的 Hexo 博客。

## 功能特性

- ✅ **GitHub OAuth 认证** - 安全的 GitHub 账户登录和授权
- ✅ **文章管理** - 创建、编辑、删除文章
- ✅ **Markdown 编辑器** - 基于 CodeMirror 6 的强大编辑器
- ✅ **实时预览** - 即时查看 Markdown 渲染效果
- ✅ **自动保存** - 本地自动保存，手动提交到 GitHub
- ✅ **Hexo 优化** - 自动生成 front-matter 和格式化文件名
- ✅ **移动端友好** - 响应式设计，完美支持移动设备
- ✅ **离线编辑** - 支持本地草稿恢复

## 技术栈

### 后端
- Cloudflare Workers (Edge Computing)
- TypeScript
- GitHub REST API
- GitHub OAuth 2.0
- Cloudflare KV (会话存储)

### 前端
- Svelte 5
- Tailwind CSS
- CodeMirror 6 (Markdown 编辑器)
- marked.js (Markdown 预览)

## 快速开始

### 前置要求

- Node.js 18+
- npm 或 yarn
- Cloudflare 账户
- GitHub 账户

### 安装

```bash
# 克隆仓库
git clone <your-repo-url>
cd blogwriter

# 安装依赖
npm install
```

### 配置

1. **创建 GitHub OAuth App**

   访问 [GitHub Developer Settings](https://github.com/settings/developers) 创建新的 OAuth App：
   - Application name: Hexo Blog Manager
   - Homepage URL: `https://your-domain.workers.dev`
   - Authorization callback URL: `https://your-domain.workers.dev/auth/callback`

2. **创建 Cloudflare KV Namespace**

   ```bash
   npx wrangler kv:namespace create SESSIONS
   ```

3. **配置 wrangler.toml**

   更新 `wrangler.toml` 中的配置：
   ```toml
   [[kv_namespaces]]
   binding = "SESSIONS"
   id = "your-kv-namespace-id"  # 替换为实际的 KV ID
   preview_id = "your-preview-kv-namespace-id"

   [vars]
   GITHUB_CLIENT_ID = "your-github-client-id"  # 替换为实际的 Client ID
   GITHUB_REDIRECT_URI = "https://your-domain.workers.dev/auth/callback"
   ```

4. **设置 GitHub Client Secret**

   ```bash
   npx wrangler secret put GITHUB_CLIENT_SECRET
   # 粘贴您的 GitHub Client Secret
   ```

### 开发

```bash
# 启动开发服务器
npm run dev

# 启动 Workers 开发服务器（另一个终端）
npm run wrangler:dev
```

访问 `http://localhost:5173` 查看前端，API 请求会代理到 `http://localhost:8787`。

### 构建

```bash
npm run build
```

### 部署

```bash
# 登录 Cloudflare
npx wrangler login

# 部署
npm run deploy
```

## 使用说明

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

### 自动保存

- 编辑器会每 30 秒自动保存到浏览器本地存储
- 失去焦点时也会自动保存
- 只有点击"保存"按钮才会提交到 GitHub
- 下次打开时会提示恢复未保存的草稿

### 删除文章

1. 在文章列表中点击删除按钮
2. 确认删除操作
3. 文章将从 GitHub 仓库中删除

## 项目结构

```
blogwriter/
├── src/
│   ├── worker/              # Cloudflare Workers 后端
│   │   ├── index.ts         # Worker 入口
│   │   ├── auth.ts          # 认证逻辑
│   │   ├── github.ts        # GitHub API 封装
│   │   └── posts.ts        # 文章管理逻辑
│   ├── app/                # Svelte 前端
│   │   ├── components/      # UI 组件
│   │   ├── stores/          # Svelte stores
│   │   └── lib/            # 工具函数
│   └── shared/             # 共享类型定义
├── wrangler.toml           # Cloudflare Workers 配置
├── package.json            # 项目依赖
└── README.md              # 项目说明
```

## API 文档

### 认证

- `GET /auth/github` - 获取 GitHub OAuth 授权 URL
- `GET /auth/callback` - OAuth 回调处理
- `GET /auth/user` - 获取当前用户信息
- `POST /auth/logout` - 登出

### 文章管理

- `GET /api/posts` - 获取文章列表
- `GET /api/posts/:path` - 获取文章详情
- `POST /api/posts` - 创建新文章
- `PUT /api/posts/:path` - 更新文章
- `DELETE /api/posts/:path` - 删除文章

### 仓库管理

- `GET /api/repo` - 获取仓库信息
- `GET /api/repo/branches` - 获取分支列表

## 环境变量

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID | 是 |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret | 是 |
| `GITHUB_REDIRECT_URI` | OAuth 回调 URL | 是 |
| `SESSION_KV_ID` | KV Namespace ID | 是 |

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 支持

如有问题，请提交 Issue 或联系开发者。
