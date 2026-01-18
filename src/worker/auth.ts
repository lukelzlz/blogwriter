import { Env } from './index';
import type { UserSession, GitHubUser } from '$shared/types';

// GitHub OAuth 配置
const GITHUB_OAUTH_URL = 'https://github.com/login/oauth';
const GITHUB_API_URL = 'https://api.github.com';

// GitHub OAuth Token 响应类型
interface GitHubTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

// 生成随机 state 用于 CSRF 保护
function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

// 解析 front-matter
function parseFrontMatter(content: string): { title?: string; date?: string } {
  const frontMatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontMatterRegex);
  
  if (!match) return {};
  
  const frontMatter = match[1];
  const result: { title?: string; date?: string } = {};
  
  const titleMatch = frontMatter.match(/^title:\s*(.+)$/m);
  if (titleMatch) result.title = titleMatch[1].trim();
  
  const dateMatch = frontMatter.match(/^date:\s*(.+)$/m);
  if (dateMatch) result.date = dateMatch[1].trim();
  
  return result;
}

// 生成 front-matter
function generateFrontMatter(title: string): string {
  const now = new Date();
  const dateStr = now.toISOString().replace('T', ' ').substring(0, 19);
  
  return `---
title: ${title}
date: ${dateStr}
---`;
}

// 格式化文件名
function formatFilename(title: string): string {
  // 移除特殊字符，保留中文、字母、数字、连字符和空格
  let filename = title
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
  
  return `${filename}.md`;
}

// 获取 GitHub OAuth 授权 URL
async function getGitHubAuthUrl(env: Env): Promise<string> {
  const state = generateState();
  
  // 将 state 存储到 KV，有效期 10 分钟
  await env.SESSIONS.put(`oauth_state:${state}`, JSON.stringify({ timestamp: Date.now() }), {
    expirationTtl: 600,
  });
  
  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: env.GITHUB_REDIRECT_URI,
    scope: 'repo user',
    state: state,
  });
  
  return `${GITHUB_OAUTH_URL}/authorize?${params.toString()}`;
}

// 用 code 换取 access_token
async function exchangeCodeForToken(code: string, env: Env): Promise<string> {
  const response = await fetch(`${GITHUB_OAUTH_URL}/access_token`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code: code,
    }),
  });
  
  const data: GitHubTokenResponse = await response.json();
  
  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error}`);
  }
  
  if (!data.access_token) {
    throw new Error('Failed to get access token from GitHub');
  }
  
  return data.access_token;
}

// 获取用户信息
async function getGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch(`${GITHUB_API_URL}/user`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }
  
  return response.json();
}

// 创建会话
async function createSession(env: Env, user: GitHubUser, accessToken: string): Promise<string> {
  const sessionId = crypto.randomUUID();
  const session: UserSession = {
    accessToken,
    user,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24小时后过期
  };
  
  await env.SESSIONS.put(`session:${sessionId}`, JSON.stringify(session), {
    expirationTtl: 86400, // 24小时
  });
  
  return sessionId;
}

// 验证会话
async function validateSession(env: Env, sessionId: string): Promise<UserSession | null> {
  const sessionData = await env.SESSIONS.get(`session:${sessionId}`);
  
  if (!sessionData) {
    return null;
  }
  
  const session: UserSession = JSON.parse(sessionData);
  
  // 检查是否过期
  if (Date.now() > session.expiresAt) {
    await env.SESSIONS.delete(`session:${sessionId}`);
    return null;
  }
  
  return session;
}

// 导出处理函数
export async function handleAuth(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  corsHeaders: HeadersInit
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // GET /auth/github - 获取 GitHub OAuth 授权 URL
  if (path === '/auth/github' && request.method === 'GET') {
    try {
      const authUrl = await getGitHubAuthUrl(env);
      // 返回JSON响应，让前端处理重定向
      return new Response(JSON.stringify({ url: authUrl }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Failed to generate auth URL' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  }

  // GET /auth/callback - OAuth 回调
  if (path === '/auth/callback' && request.method === 'GET') {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || !state) {
      return new Response('Missing code or state', { status: 400 });
    }

    try {
      // 验证 state
      const stateData = await env.SESSIONS.get(`oauth_state:${state}`);
      if (!stateData) {
        return new Response('Invalid state', { status: 400 });
      }
      await env.SESSIONS.delete(`oauth_state:${state}`);

      // 换取 access_token
      const accessToken = await exchangeCodeForToken(code, env);

      // 获取用户信息
      const user = await getGitHubUser(accessToken);

      // 创建会话
      const sessionId = await createSession(env, user, accessToken);

      // 重定向到前端，带上 session ID
      const frontendUrl = url.origin;
      return Response.redirect(`${frontendUrl}/?session=${sessionId}`, 302);
    } catch (error) {
      console.error('OAuth callback error:', error);
      return new Response('Authentication failed', { status: 500 });
    }
  }

  // GET /auth/user - 获取当前用户信息
  if (path === '/auth/user' && request.method === 'GET') {
    const sessionId = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'No session provided' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const session = await validateSession(env, sessionId);
    
    if (!session) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ user: session.user }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // POST /auth/logout - 登出
  if (path === '/auth/logout' && request.method === 'POST') {
    const sessionId = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (sessionId) {
      await env.SESSIONS.delete(`session:${sessionId}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  return new Response('Not Found', { status: 404, headers: corsHeaders });
}

// 导出工具函数供其他模块使用
export { validateSession, generateFrontMatter, formatFilename, parseFrontMatter };
