import { handleAuth } from './auth';
import { handlePosts } from './posts';
import { handleRepo } from './github';
import { handleUpload } from './upload';

export interface Env {
  SESSIONS: KVNamespace;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GITHUB_REDIRECT_URI: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // 获取请求的来源
    const origin = request.headers.get('Origin');
    
    // 允许的来源列表
    const allowedOrigins = [
      'https://writer.qwqc.cc',
      // 本地开发环境
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
    ];
    
    // 验证来源是否在允许列表中
    const isAllowedOrigin = origin && allowedOrigins.includes(origin);
    
    // CORS headers - 使用动态的 Origin
    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };
    
    // 只有当来源在允许列表中时才设置 Access-Control-Allow-Origin
    if (isAllowedOrigin) {
      corsHeaders['Access-Control-Allow-Origin'] = origin;
    }
    
    // 如果需要支持凭证（cookies），添加以下头
    // corsHeaders['Access-Control-Allow-Credentials'] = 'true';

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        status: 204,
        headers: corsHeaders 
      });
    }

    try {
      // Auth routes
      if (path.startsWith('/auth')) {
        return handleAuth(request, env, ctx, corsHeaders);
      }

      // API routes
      if (path.startsWith('/api/posts')) {
        return handlePosts(request, env, ctx, corsHeaders);
      }

      if (path.startsWith('/api/repo')) {
        return handleRepo(request, env, ctx, corsHeaders);
      }

      // 图片上传路由
      if (path === '/api/upload') {
        return handleUpload(request, env, ctx, corsHeaders);
      }

      // For static files, redirect to Cloudflare Pages
      // This assumes you have deployed the frontend to Cloudflare Pages
      const pagesUrl = 'https://writer.qwqc.cc';
      if (path.startsWith('/assets')) {
        // Redirect to Pages for static assets
        return Response.redirect(`${pagesUrl}${path}`, 302);
      }

      // For root path, return a simple message with instructions
      if (path === '/' || path === '') {
        return new Response(
          `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hexo Blog Manager</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      line-height: 1.6;
    }
    h1 { color: #333; }
    p { color: #666; }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .info {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h1>Hexo Blog Manager API</h1>
  <p>欢迎使用 Hexo Blog Manager API 服务。</p>
  <div class="info">
    <p><strong>前端应用：</strong> <a href="https://writer.qwqc.cc">https://writer.qwqc.cc</a></p>
    <p><strong>API 端点：</strong></p>
    <ul>
      <li><code>POST /auth/github</code> - GitHub OAuth 登录</li>
      <li><code>GET /auth/callback</code> - GitHub OAuth 回调</li>
      <li><code>GET /api/posts</code> - 获取文章列表</li>
      <li><code>POST /api/posts</code> - 创建新文章</li>
      <li><code>PUT /api/posts/:slug</code> - 更新文章</li>
      <li><code>DELETE /api/posts/:slug</code> - 删除文章</li>
      <li><code>GET /api/repo</code> - 获取仓库信息</li>
    </ul>
  </div>
  <p>请访问前端应用以开始使用 Hexo Blog Manager。</p>
</body>
</html>`,
          {
            headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders },
          }
        );
      }

      // 404
      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error('Error handling request:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error', message: error instanceof Error ? error.message : 'Unknown error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  },
};
