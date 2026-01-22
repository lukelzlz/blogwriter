# 部署指南

本文档将指导您完成 Hexo 博客管理器的部署。

## 在线演示

- **前端应用**: [https://writer.qwqc.cc](https://writer.qwqc.cc)
- **API 服务**: [https://writer-api.qwqc.cc](https://writer-api.qwqc.cc)

## 架构说明

本项目采用前后端分离架构：

- **前端**: 部署在 Cloudflare Pages
- **后端 API**: 部署在 Cloudflare Workers
- **会话存储**: Cloudflare KV
- **图片存储**: S3 兼容存储（用户自行配置）

## 前置条件

- Node.js 18 或更高版本
- npm 或 yarn
- Cloudflare 账户（免费账户即可）
- GitHub 账户
- Git 客户端

## 第一步：创建 GitHub OAuth App

1. 登录您的 GitHub 账户
2. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
3. 点击 "New OAuth App" 按钮
4. 填写以下信息：
   - **Application name**: `Hexo Blog Manager`
   - **Homepage URL**: `https://your-pages-domain.pages.dev`（前端域名）
   - **Application description**: `Hexo 博客管理工具`
   - **Authorization callback URL**: `https://your-worker-domain.workers.dev/auth/callback`（API 域名）
5. 点击 "Register application"
6. 记录下以下信息：
   - **Client ID**: 以 `Ov23li` 开头的字符串
   - **Client Secret**: 点击 "Generate a new client secret" 生成

> ⚠️ **重要**: 回调 URL 必须指向 Worker API 域名，而不是 Pages 前端域名。

## 第二步：安装依赖

```bash
cd blogwriter
npm install
```

## 第三步：配置 Cloudflare Workers

### 3.1 安装 Wrangler CLI

```bash
npm install -g wrangler
```

### 3.2 登录 Cloudflare

```bash
wrangler login
```

这会打开浏览器让您授权 Wrangler 访问您的 Cloudflare 账户。

### 3.3 创建 KV Namespace

```bash
# 创建生产环境 KV
wrangler kv:namespace create SESSIONS

# 创建预览环境 KV（可选）
wrangler kv:namespace create SESSIONS --preview
```

记下输出的 `id` 值，例如：`abc123def456...`

### 3.4 更新 wrangler.toml

编辑 `wrangler.toml` 文件，替换以下占位符：

```toml
name = "blogwriter"
main = "src/worker/index.ts"
compatibility_date = "2024-01-01"

# KV Namespace for session storage
[[kv_namespaces]]
binding = "SESSIONS"
id = "your-kv-namespace-id"           # 替换为实际的 KV ID
preview_id = "your-preview-kv-id"     # 替换为预览 KV ID

[vars]
GITHUB_CLIENT_ID = "your-github-client-id"                              # 替换为实际的 Client ID
GITHUB_REDIRECT_URI = "https://your-worker-domain.workers.dev/auth/callback"  # 替换为 Worker 域名
```

### 3.5 设置 GitHub Client Secret

```bash
wrangler secret put GITHUB_CLIENT_SECRET
```

粘贴您的 GitHub Client Secret 并按回车。

## 第四步：配置前端 API 地址

创建 `.env` 文件（或修改 `.env.example`）：

```bash
# API 基础 URL（指向 Worker）
VITE_API_BASE_URL=https://your-worker-domain.workers.dev
```

## 第五步：构建项目

```bash
npm run build
```

这会生成 `dist` 目录，包含编译后的前端文件。

## 第六步：部署

### 6.1 部署 Worker（API 服务）

```bash
npm run deploy:worker
# 或
wrangler deploy
```

部署完成后，Wrangler 会显示您的 Workers 域名：
```
Published blogwriter (X.X sec)
  https://blogwriter.your-subdomain.workers.dev
```

### 6.2 部署 Pages（前端）

```bash
npm run deploy:pages
# 或
npm run deploy
```

首次部署会提示创建项目，输入项目名称（如 `blogwriter`）。

部署完成后会显示 Pages 域名：
```
✨ Deployment complete! Take a peek over at https://blogwriter.pages.dev
```

### 6.3 配置自定义域名（可选）

在 Cloudflare Dashboard 中：

1. **Workers 自定义域名**:
   - 进入 Workers & Pages > 选择 Worker
   - 点击 "Triggers" > "Custom Domains"
   - 添加自定义域名（如 `writer-api.yourdomain.com`）

2. **Pages 自定义域名**:
   - 进入 Workers & Pages > 选择 Pages 项目
   - 点击 "Custom domains"
   - 添加自定义域名（如 `writer.yourdomain.com`）

## 第七步：更新配置

配置自定义域名后，需要更新以下配置：

### 7.1 更新 GitHub OAuth App

回到 GitHub OAuth App 设置页面，更新：
- **Homepage URL**: 前端域名
- **Authorization callback URL**: API 域名 + `/auth/callback`

### 7.2 更新 wrangler.toml

```toml
[vars]
GITHUB_REDIRECT_URI = "https://writer-api.yourdomain.com/auth/callback"
```

### 7.3 更新 Worker 代码中的前端 URL

在 `src/worker/auth.ts` 和 `src/worker/index.ts` 中更新前端 URL：

```typescript
const frontendUrl = 'https://writer.yourdomain.com';
```

### 7.4 重新部署

```bash
npm run build
npm run deploy:worker
npm run deploy:pages
```

## 第八步：测试部署

1. 访问您的前端域名
2. 点击 "使用 GitHub 登录"
3. 授权应用访问您的 GitHub 仓库
4. 登录成功后，在设置页面配置您的 Hexo 博客仓库
5. 配置 S3 存储（可选，用于图片上传）
6. 开始创建和管理文章！

## 开发模式

### 本地开发

```bash
# 终端 1: 启动前端开发服务器
npm run dev

# 终端 2: 启动 Workers 本地服务器
npm run wrangler:dev
```

访问 `http://localhost:5173` 查看应用。

本地开发时，Vite 会自动代理 `/api` 和 `/auth` 请求到 Worker 服务器（端口 8787）。

### 预览部署

```bash
wrangler dev src/worker/index.ts --local
```

## 环境变量说明

### Worker 环境变量

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID | 是 |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret（密钥） | 是 |
| `GITHUB_REDIRECT_URI` | OAuth 回调 URL | 是 |

### 前端环境变量

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `VITE_API_BASE_URL` | API 基础 URL | 是 |

## 常见问题

### Q: 部署后无法访问

A: 检查以下几点：
1. Workers 是否成功部署
2. Pages 是否成功部署
3. KV Namespace 是否正确配置
4. 环境变量是否正确设置
5. CORS 配置是否包含前端域名

### Q: OAuth 登录失败

A: 确保：
1. GitHub Client ID 和 Secret 正确
2. 回调 URL 与 OAuth App 设置中的一致
3. 回调 URL 指向 Worker 域名而非 Pages 域名
4. 应用有正确的权限（repo, user）

### Q: 登录后重定向失败

A: 检查：
1. Worker 代码中的 `frontendUrl` 是否正确
2. CORS 配置是否包含前端域名
3. 浏览器是否阻止了重定向

### Q: 无法访问 GitHub 仓库

A: 检查：
1. 仓库名称和所有者是否正确
2. 您的 GitHub 账户是否有访问权限
3. 仓库是否为公开或您已授权访问

### Q: 图片上传失败

A: 检查：
1. S3 配置是否正确
2. Access Key 和 Secret Key 是否有效
3. Bucket 是否存在且有写入权限
4. Endpoint 和 Region 是否匹配

### Q: 自动保存不工作

A: 自动保存使用浏览器 localStorage，确保：
1. 浏览器支持 localStorage
2. 没有禁用 cookies 或本地存储
3. 浏览器存储空间充足

### Q: PWA 更新不生效

A: 尝试：
1. 清除浏览器缓存
2. 注销 Service Worker
3. 硬刷新页面（Ctrl/Cmd + Shift + R）

## 更新部署

### 更新代码

```bash
# 修改代码后
npm run build
npm run deploy:worker
npm run deploy:pages
```

### 更新配置

```bash
# 更新环境变量
wrangler secret put GITHUB_CLIENT_SECRET

# 更新 wrangler.toml 中的配置
# 然后重新部署
npm run deploy:worker
```

## 监控和日志

### 查看 Workers 日志

```bash
wrangler tail
```

这会实时显示 Workers 的日志输出。

### 查看部署历史

```bash
wrangler deployments list
```

### Cloudflare Dashboard

在 Cloudflare Dashboard 中可以查看：
- Workers 请求量和错误率
- Pages 部署历史
- KV 存储使用情况

## 性能优化

1. **启用缓存**: Cloudflare Workers 自动缓存静态资源
2. **使用 CDN**: Workers 和 Pages 部署在全球边缘节点
3. **压缩资源**: Vite 自动压缩 JS 和 CSS
4. **代码分割**: Ace Editor 单独打包，按需加载
5. **PWA 缓存**: Service Worker 缓存静态资源

## 安全建议

1. **定期更新依赖**: 运行 `npm audit` 检查安全漏洞
2. **使用 HTTPS**: Cloudflare 自动提供 HTTPS
3. **保护密钥**: 不要将 Client Secret 提交到 Git
4. **限制权限**: 只授予必要的 GitHub 权限
5. **监控使用**: 定期检查 Cloudflare 控制台
6. **CORS 配置**: 只允许信任的域名访问 API

## 故障排除

### 构建失败

```bash
# 清除缓存重新构建
rm -rf node_modules dist
npm install
npm run build
```

### 类型错误

```bash
# 检查类型
npm run type-check
# 或
npm run check
```

### 部署超时

```bash
# 增加超时时间
wrangler deploy --timeout 300
```

### KV 操作失败

```bash
# 检查 KV 配置
wrangler kv:namespace list

# 查看 KV 内容
wrangler kv:key list --namespace-id=your-kv-id
```

## 获取帮助

如遇到问题：
1. 查看 [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
2. 查看 [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
3. 查看 [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
4. 提交 [GitHub Issue](https://github.com/lukelzlz/blogwriter/issues)
