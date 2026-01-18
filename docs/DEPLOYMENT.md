# 部署指南

本文档将指导您完成 Hexo 博客管理器的部署。

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
   - **Homepage URL**: `https://your-domain.workers.dev`（稍后替换为实际域名）
   - **Application description**: `Hexo 博客管理工具`
   - **Authorization callback URL**: `https://your-domain.workers.dev/auth/callback`
5. 点击 "Register application"
6. 记录下以下信息：
   - **Client ID**: 以 `Iv1` 开头的字符串
   - **Client Secret**: 点击 "Generate a new client secret" 生成

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
wrangler kv:namespace create SESSIONS
```

记下输出的 `id` 值，例如：`abc123def456...`

### 3.4 更新 wrangler.toml

编辑 `wrangler.toml` 文件，替换以下占位符：

```toml
name = "hexo-blog-manager"
main = "src/worker/index.ts"
compatibility_date = "2024-01-01"

[site]
bucket = "./dist"

# KV Namespace for session storage
[[kv_namespaces]]
binding = "SESSIONS"
id = "your-kv-namespace-id"  # 替换为实际的 KV ID
preview_id = "your-preview-kv-namespace-id"  # 替换为实际的预览 KV ID

[vars]
GITHUB_CLIENT_ID = "your-github-client-id"  # 替换为实际的 Client ID
GITHUB_REDIRECT_URI = "https://your-domain.workers.dev/auth/callback"  # 替换为实际的域名
```

### 3.5 设置 GitHub Client Secret

```bash
wrangler secret put GITHUB_CLIENT_SECRET
```

粘贴您的 GitHub Client Secret 并按回车。

### 3.6 创建预览环境（可选）

```bash
wrangler kv:namespace create SESSIONS --preview
```

将输出的 `id` 更新到 `wrangler.toml` 的 `preview_id` 字段。

## 第四步：构建项目

```bash
npm run build
```

这会生成 `dist` 目录，包含编译后的前端文件。

## 第五步：部署到 Cloudflare Workers

```bash
npm run deploy
```

部署完成后，Wrangler 会显示您的 Workers 域名，例如：
```
Published hexo-blog-manager (X.X sec)
  https://hexo-blog-manager.your-subdomain.workers.dev
```

## 第六步：更新 GitHub OAuth 配置

回到 GitHub OAuth App 设置页面，更新以下 URL：

- **Homepage URL**: 替换为实际的 Workers 域名
- **Authorization callback URL**: 替换为实际的 Workers 域名 + `/auth/callback`

## 第七步：测试部署

1. 访问您的 Workers 域名
2. 点击 "使用 GitHub 登录"
3. 授权应用访问您的 GitHub 仓库
4. 登录成功后，在设置页面配置您的 Hexo 博客仓库
5. 开始创建和管理文章！

## 开发模式

### 本地开发

```bash
# 终端 1: 启动前端开发服务器
npm run dev

# 终端 2: 启动 Workers 本地服务器
npm run wrangler:dev
```

访问 `http://localhost:5173` 查看应用。

### 预览部署

```bash
wrangler dev src/worker/index.ts
```

## 常见问题

### Q: 部署后无法访问

A: 检查以下几点：
1. Workers 是否成功部署
2. KV Namespace 是否正确配置
3. 环境变量是否正确设置
4. GitHub OAuth 回调 URL 是否正确

### Q: OAuth 登录失败

A: 确保：
1. GitHub Client ID 和 Secret 正确
2. 回调 URL 与 OAuth App 设置中的一致
3. 应用有正确的权限（repo, user）

### Q: 无法访问 GitHub 仓库

A: 检查：
1. 仓库名称和所有者是否正确
2. 您的 GitHub 账户是否有访问权限
3. 仓库是否为公开或您已授权访问

### Q: 自动保存不工作

A: 自动保存使用浏览器 localStorage，确保：
1. 浏览器支持 localStorage
2. 没有禁用 cookies 或本地存储
3. 浏览器存储空间充足

## 更新部署

### 更新代码

```bash
# 修改代码后
npm run build
npm run deploy
```

### 更新配置

```bash
# 更新环境变量
wrangler secret put GITHUB_CLIENT_SECRET

# 更新 wrangler.toml 中的配置
# 然后重新部署
npm run deploy
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

## 性能优化

1. **启用缓存**: Cloudflare Workers 自动缓存静态资源
2. **使用 CDN**: Workers 部署在全球边缘节点
3. **压缩资源**: Vite 自动压缩 JS 和 CSS
4. **懒加载**: Svelte 自动进行代码分割

## 安全建议

1. **定期更新依赖**: 运行 `npm audit` 检查安全漏洞
2. **使用 HTTPS**: Cloudflare Workers 自动提供 HTTPS
3. **保护密钥**: 不要将 Client Secret 提交到 Git
4. **限制权限**: 只授予必要的 GitHub 权限
5. **监控使用**: 定期检查 Cloudflare 控制台

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
# 重新生成类型
npm run type-check
```

### 部署超时

```bash
# 增加超时时间
wrangler deploy --timeout 300
```

## 获取帮助

如遇到问题：
1. 查看 [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
2. 查看 [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)
3. 提交 [GitHub Issue](https://github.com/your-repo/issues)
