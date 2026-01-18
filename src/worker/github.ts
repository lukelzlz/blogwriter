import { Env } from './index';
import type { GitHubRepo, GitHubFile } from '$shared/types';

const GITHUB_API_URL = 'https://api.github.com';

// 获取仓库信息
export async function getRepoInfo(
  owner: string,
  repo: string,
  accessToken: string
): Promise<GitHubRepo> {
  const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch repo info');
  }

  return response.json();
}

// 获取仓库分支列表
export async function getRepoBranches(
  owner: string,
  repo: string,
  accessToken: string
): Promise<Array<{ name: string; commit: { sha: string } }>> {
  const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/branches`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch branches');
  }

  return response.json();
}

// 获取目录内容
export async function getDirectoryContents(
  owner: string,
  repo: string,
  path: string,
  accessToken: string,
  branch?: string
): Promise<GitHubFile[]> {
  const url = new URL(`${GITHUB_API_URL}/repos/${owner}/${repo}/contents/${path}`);
  if (branch) {
    url.searchParams.set('ref', branch);
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch directory contents');
  }

  return response.json();
}

// 获取文件内容
export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  accessToken: string,
  branch?: string
): Promise<{ content: string; sha: string }> {
  const url = new URL(`${GITHUB_API_URL}/repos/${owner}/${repo}/contents/${path}`);
  if (branch) {
    url.searchParams.set('ref', branch);
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch file content');
  }

  const data = await response.json();
  
  // Base64 解码
  const content = atob(data.content);
  
  return {
    content,
    sha: data.sha,
  };
}

// 创建或更新文件
export async function createOrUpdateFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  accessToken: string,
  sha?: string,
  branch?: string
): Promise<{ content: GitHubFile; commit: { sha: string } }> {
  const body: any = {
    message,
    content: btoa(content),
  };

  if (sha) {
    body.sha = sha;
  }

  if (branch) {
    body.branch = branch;
  }

  const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create/update file: ${error.message}`);
  }

  return response.json();
}

// 删除文件
export async function deleteFile(
  owner: string,
  repo: string,
  path: string,
  message: string,
  accessToken: string,
  sha: string,
  branch?: string
): Promise<{ commit: { sha: string } }> {
  const body: any = {
    message,
    sha,
  };

  if (branch) {
    body.branch = branch;
  }

  const response = await fetch(`${GITHUB_API_URL}/repos/${owner}/${repo}/contents/${path}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to delete file: ${error.message}`);
  }

  return response.json();
}

// 导出处理函数
export async function handleRepo(
  request: Request,
  env: Env,
  ctx: any,
  corsHeaders: HeadersInit
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // GET /api/repo - 获取仓库信息
  if (path === '/api/repo' && request.method === 'GET') {
    const sessionId = request.headers.get('Authorization')?.replace('Bearer ', '');
    const owner = url.searchParams.get('owner');
    const repo = url.searchParams.get('repo');

    if (!sessionId || !owner || !repo) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    try {
      // 从会话中获取 access token
      const sessionData = await env.SESSIONS.get(`session:${sessionId}`);
      if (!sessionData) {
        return new Response(JSON.stringify({ error: 'Invalid session' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const session = JSON.parse(sessionData);
      const repoInfo = await getRepoInfo(owner, repo, session.accessToken);

      return new Response(JSON.stringify({ data: repoInfo }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } catch (error) {
      console.error('Error fetching repo info:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch repo info' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  }

  // GET /api/repo/branches - 获取分支列表
  if (path === '/api/repo/branches' && request.method === 'GET') {
    const sessionId = request.headers.get('Authorization')?.replace('Bearer ', '');
    const owner = url.searchParams.get('owner');
    const repo = url.searchParams.get('repo');

    if (!sessionId || !owner || !repo) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    try {
      const sessionData = await env.SESSIONS.get(`session:${sessionId}`);
      if (!sessionData) {
        return new Response(JSON.stringify({ error: 'Invalid session' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const session = JSON.parse(sessionData);
      const branches = await getRepoBranches(owner, repo, session.accessToken);

      return new Response(JSON.stringify({ data: branches }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } catch (error) {
      console.error('Error fetching branches:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch branches' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  }

  return new Response('Not Found', { status: 404, headers: corsHeaders });
}
