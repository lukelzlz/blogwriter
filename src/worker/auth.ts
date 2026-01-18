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
  
  // 🔍 调试日志：记录 OAuth 配置
  console.log('🔍 [OAuth Debug] GitHub OAuth 配置:');
  console.log('  - Client ID:', env.GITHUB_CLIENT_ID);
  console.log('  - Redirect URI:', env.GITHUB_REDIRECT_URI);
  console.log('  - State:', state);
  console.log('  - 完整 URL:', `${GITHUB_OAUTH_URL}/authorize?${params.toString()}`);
  
  return `${GITHUB_OAUTH_URL}/authorize?${params.toString()}`;
}

// 用 code 换取 access_token
async function exchangeCodeForToken(code: string, env: Env): Promise<string> {
  console.log('🔍 [Token Exchange Debug] 开始交换 code...');
  console.log('  - Client ID:', env.GITHUB_CLIENT_ID);
  console.log('  - Client Secret:', env.GITHUB_CLIENT_SECRET ? '已配置' : '未配置');
  console.log('  - Code:', code.substring(0, 10) + '...');
  
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
  
  console.log('  - GitHub 响应状态:', response.status, response.statusText);
  
  const data: GitHubTokenResponse = await response.json();
  
  console.log('  - GitHub 响应数据:', JSON.stringify(data, null, 2));
  
  if (data.error) {
    console.error('❌ [Token Exchange Error] GitHub 返回错误');
    console.error('  - 错误:', data.error);
    if (data.error_description) {
      console.error('  - 错误描述:', data.error_description);
    }
    throw new Error(`GitHub OAuth error: ${data.error}${data.error_description ? ` - ${data.error_description}` : ''}`);
  }
  
  if (!data.access_token) {
    console.error('❌ [Token Exchange Error] 响应中缺少 access_token');
    throw new Error('Failed to get access token from GitHub');
  }
  
  console.log('✅ [Token Exchange Debug] 成功获取 access_token');
  return data.access_token;
}

// 获取用户信息
async function getGitHubUser(accessToken: string): Promise<GitHubUser> {
  console.log('🔍 [User Info Debug] 开始获取用户信息...');
  console.log('  - Access Token:', accessToken.substring(0, 10) + '...');
  
  const response = await fetch(`${GITHUB_API_URL}/user`, {
    headers: {
      // 🔧 修复：GitHub OAuth access_token 需要使用 'token' 前缀而不是 'Bearer'
      'Authorization': `token ${accessToken}`,
      'Accept': 'application/json',
    },
  });
  
  console.log('  - GitHub API 响应状态:', response.status, response.statusText);
  
  if (!response.ok) {
    console.error('❌ [User Info Error] 获取用户信息失败');
    console.error('  - 响应状态:', response.status);
    const errorText = await response.text();
    console.error('  - 响应内容:', errorText);
    throw new Error(`Failed to fetch user info: ${response.status} ${response.statusText}`);
  }
  
  const user: GitHubUser = await response.json();
  console.log('✅ [User Info Debug] 成功获取用户信息');
  console.log('  - 用户登录名:', user.login);
  console.log('  - 用户 ID:', user.id);
  console.log('  - 用户名:', user.name);
  
  return user;
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

    // 🔍 调试日志：记录回调参数
    console.log('🔍 [OAuth Callback Debug] 收到回调请求');
    console.log('  - Code:', code ? `${code.substring(0, 10)}...` : 'null');
    console.log('  - State:', state ? `${state.substring(0, 10)}...` : 'null');
    console.log('  - 完整 URL:', url.toString());

    if (!code || !state) {
      console.error('❌ [OAuth Callback Error] 缺少 code 或 state 参数');
      return new Response('Missing code or state', { status: 400 });
    }

    try {
      // 🔍 调试日志：开始验证 state
      console.log('🔍 [OAuth Callback Debug] 步骤 1: 验证 state...');
      const stateData = await env.SESSIONS.get(`oauth_state:${state}`);
      console.log('  - State 存在:', !!stateData);
      if (stateData) {
        console.log('  - State 数据:', stateData);
      }
      
      if (!stateData) {
        console.error('❌ [OAuth Callback Error] State 验证失败 - state 不存在于 KV 存储中');
        return new Response('Invalid state', { status: 400 });
      }
      await env.SESSIONS.delete(`oauth_state:${state}`);
      console.log('✅ [OAuth Callback Debug] State 验证成功');

      // 🔍 调试日志：开始交换 code
      console.log('🔍 [OAuth Callback Debug] 步骤 2: 交换 code 获取 access_token...');
      const accessToken = await exchangeCodeForToken(code, env);
      console.log('  - Access Token:', accessToken ? `${accessToken.substring(0, 10)}...` : 'null');
      console.log('✅ [OAuth Callback Debug] Code 交换成功');

      // 🔍 调试日志：获取用户信息
      console.log('🔍 [OAuth Callback Debug] 步骤 3: 获取用户信息...');
      const user = await getGitHubUser(accessToken);
      console.log('  - 用户:', user.login);
      console.log('✅ [OAuth Callback Debug] 用户信息获取成功');

      // 🔍 调试日志：创建会话
      console.log('🔍 [OAuth Callback Debug] 步骤 4: 创建会话...');
      const sessionId = await createSession(env, user, accessToken);
      console.log('  - Session ID:', sessionId);
      console.log('✅ [OAuth Callback Debug] 会话创建成功');

      // 重定向到前端，带上 session ID
      // 使用硬编码的前端 URL，而不是请求的 origin
      const frontendUrl = 'https://writer.qwqc.cc';
      const redirectUrl = `${frontendUrl}/?session=${sessionId}`;
      console.log('🔍 [OAuth Callback Debug] 步骤 5: 重定向到前端');
      console.log('  - 重定向 URL:', redirectUrl);
      console.log('✅ [OAuth Callback Debug] OAuth 流程完成');
      return Response.redirect(redirectUrl, 302);
    } catch (error) {
      console.error('❌ [OAuth Callback Error] OAuth 回调失败');
      console.error('  - 错误类型:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('  - 错误消息:', error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.stack) {
        console.error('  - 错误堆栈:', error.stack);
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return new Response(`Authentication failed: ${errorMessage}`, { status: 500 });
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
