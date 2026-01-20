import { Env } from './index';
import { validateSession, generateFrontMatter, formatFilename } from './auth';
import {
  getDirectoryContents,
  getFileContent,
  createOrUpdateFile,
  deleteFile,
} from './github';
import type { Post, CreatePostParams, UpdatePostParams } from '$shared/types';

// 获取文章列表
export async function getPosts(
  owner: string,
  repo: string,
  accessToken: string,
  path: string = '_posts',
  branch?: string
): Promise<Post[]> {
  console.log('[DEBUG] getPosts called with:', { owner, repo, path, branch });

  const files = await getDirectoryContents(owner, repo, path, accessToken, branch);

  console.log('[DEBUG] Files from GitHub API:', files);
  console.log('[DEBUG] Total files count:', files.length);

  // 过滤出 Markdown 文件
  const markdownFiles = files.filter((file) =>
    file.type === 'file' && file.name.endsWith('.md')
  );

  console.log('[DEBUG] Markdown files count:', markdownFiles.length);
  console.log('[DEBUG] Markdown files:', markdownFiles.map(f => ({ name: f.name, path: f.path })));

  // 获取每个文件的内容并解析 front-matter
  const postsWithFrontMatter = await Promise.all(
    markdownFiles.map(async (file) => {
      try {
        const { content } = await getFileContent(owner, repo, file.path, accessToken, branch);
        
        // 解析 front-matter
        const frontMatterRegex = /^---\n([\s\S]*?)\n---/;
        const match = content.match(frontMatterRegex);
        
        let frontMatter = undefined;
        if (match) {
          const frontMatterText = match[1];
          const titleMatch = frontMatterText.match(/^title:\s*(.+)$/m);
          const dateMatch = frontMatterText.match(/^date:\s*(.+)$/m);
          
          // 只有当 title 和 date 都存在时才设置 frontMatter
          if (titleMatch && dateMatch) {
            frontMatter = {
              title: titleMatch[1].trim(),
              date: dateMatch[1].trim(),
            };
          }
        }
        
        return {
          path: file.path,
          name: file.name,
          sha: file.sha,
          size: file.size,
          url: file.html_url,
          frontMatter,
        };
      } catch (error) {
        console.error(`Error fetching content for ${file.path}:`, error);
        // 如果获取内容失败，返回不带 front-matter 的文章
        return {
          path: file.path,
          name: file.name,
          sha: file.sha,
          size: file.size,
          url: file.html_url,
        };
      }
    })
  );

  // 按日期降序排序（最新的在前）
  postsWithFrontMatter.sort((a, b) => {
    const dateA = a.frontMatter?.date ? new Date(a.frontMatter.date).getTime() : 0;
    const dateB = b.frontMatter?.date ? new Date(b.frontMatter.date).getTime() : 0;
    return dateB - dateA;
  });

  return postsWithFrontMatter;
}

// 获取单个文章
export async function getPost(
  owner: string,
  repo: string,
  path: string,
  accessToken: string,
  branch?: string
): Promise<Post> {
  const { content, sha } = await getFileContent(owner, repo, path, accessToken, branch);
  
  // 解析 front-matter
  const frontMatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontMatterRegex);
  
  let frontMatter = undefined;
  if (match) {
    const frontMatterText = match[1];
    const titleMatch = frontMatterText.match(/^title:\s*(.+)$/m);
    const dateMatch = frontMatterText.match(/^date:\s*(.+)$/m);
    
    // 只有当 title 和 date 都存在时才设置 frontMatter
    if (titleMatch && dateMatch) {
      frontMatter = {
        title: titleMatch[1].trim(),
        date: dateMatch[1].trim(),
      };
    }
  }
  
  return {
    path,
    name: path.split('/').pop() || '',
    sha,
    size: content.length,
    url: `https://github.com/${owner}/${repo}/blob/${branch || 'main'}/${path}`,
    content,
    frontMatter,
  };
}

// 创建文章
export async function createPost(
  owner: string,
  repo: string,
  params: CreatePostParams,
  accessToken: string,
  branch?: string
): Promise<Post> {
  const { title, content: userContent, path: customPath } = params;
  
  // 生成文件名
  const filename = formatFilename(title);
  const filePath = customPath ? `${customPath}/${filename}` : `_posts/${filename}`;
  
  // 生成 front-matter 和内容
  const frontMatterStr = generateFrontMatter(title);
  const fullContent = `${frontMatterStr}\n\n${userContent}`;

  // 提交到 GitHub
  const result = await createOrUpdateFile(
    owner,
    repo,
    filePath,
    fullContent,
    `Create: ${title}`,
    accessToken,
    undefined,
    branch
  );

  // 解析 front-matter
  const frontMatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = fullContent.match(frontMatterRegex);

  let frontMatter = undefined;
  if (match) {
    const frontMatterText = match[1];
    const titleMatch = frontMatterText.match(/^title:\s*(.+)$/m);
    const dateMatch = frontMatterText.match(/^date:\s*(.+)$/m);

    if (titleMatch && dateMatch) {
      frontMatter = {
        title: titleMatch[1].trim(),
        date: dateMatch[1].trim(),
      };
    }
  }

  return {
    path: filePath,
    name: filename,
    sha: result.content.sha,
    size: fullContent.length,
    url: result.content.html_url,
    content: fullContent,
    frontMatter,
  };
}

// 更新文章
export async function updatePost(
  owner: string,
  repo: string,
  params: UpdatePostParams,
  accessToken: string,
  branch?: string
): Promise<Post> {
  const { path, content, sha } = params;

  console.log('[DEBUG] updatePost called with:', { owner, repo, path, contentLength: content?.length, sha, branch });

  // 提交到 GitHub
  const result = await createOrUpdateFile(
    owner,
    repo,
    path,
    content,
    `Update: ${path.split('/').pop()}`,
    accessToken,
    sha,
    branch
  );

  console.log('[DEBUG] updatePost result:', result);

  // 解析 front-matter
  const frontMatterRegex = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontMatterRegex);

  let frontMatter = undefined;
  if (match) {
    const frontMatterText = match[1];
    const titleMatch = frontMatterText.match(/^title:\s*(.+)$/m);
    const dateMatch = frontMatterText.match(/^date:\s*(.+)$/m);

    if (titleMatch && dateMatch) {
      frontMatter = {
        title: titleMatch[1].trim(),
        date: dateMatch[1].trim(),
      };
    }
  }

  return {
    path,
    name: path.split('/').pop() || '',
    sha: result.content.sha,
    size: content.length,
    url: result.content.html_url,
    content,
    frontMatter,
  };
}

// 删除文章
export async function deletePost(
  owner: string,
  repo: string,
  path: string,
  sha: string,
  accessToken: string,
  branch?: string
): Promise<void> {
  await deleteFile(
    owner,
    repo,
    path,
    `Delete: ${path.split('/').pop()}`,
    accessToken,
    sha,
    branch
  );
}

// 导出处理函数
export async function handlePosts(
  request: Request,
  env: Env,
  ctx: any,
  corsHeaders: HeadersInit
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const sessionId = request.headers.get('Authorization')?.replace('Bearer ', '');

  // 验证会话
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

  // 获取仓库信息（从会话或查询参数）
  const owner = url.searchParams.get('owner') || session.user.login;
  const repo = url.searchParams.get('repo');
  const branch = url.searchParams.get('branch') || undefined;

  if (!repo) {
    return new Response(JSON.stringify({ error: 'Repository name is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // GET /api/posts - 获取文章列表
  if (path === '/api/posts' && request.method === 'GET') {
    try {
      const postsPath = url.searchParams.get('path') || '_posts';
      const posts = await getPosts(owner, repo, session.accessToken, postsPath, branch);
      
      return new Response(JSON.stringify({ data: posts }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } catch (error) {
      console.error('Error fetching posts:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch posts' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  }

  // GET /api/posts/:path - 获取单个文章
  if (path.startsWith('/api/posts/') && request.method === 'GET') {
    // 对路径进行解码，因为 URL 中的路径已经被浏览器编码
    const postPath = decodeURIComponent(path.substring('/api/posts/'.length));

    try {
      const post = await getPost(owner, repo, postPath, session.accessToken, branch);

      return new Response(JSON.stringify({ data: post }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } catch (error) {
      console.error('Error fetching post:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch post' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  }

  // POST /api/posts - 创建文章
  if (path === '/api/posts' && request.method === 'POST') {
    try {
      const params: CreatePostParams = await request.json();
      
      if (!params.title?.trim() || !params.content) {
        return new Response(JSON.stringify({ error: 'Title and content are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      
      const post = await createPost(owner, repo, params, session.accessToken, branch);
      
      return new Response(JSON.stringify({ data: post }), {
        status: 201,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } catch (error) {
      console.error('Error creating post:', error);
      return new Response(JSON.stringify({ error: 'Failed to create post' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  }

  // PUT /api/posts/:path - 更新文章
  if (path.startsWith('/api/posts/') && request.method === 'PUT') {
    // 对路径进行解码，因为 URL 中的路径已经被浏览器编码
    const postPath = decodeURIComponent(path.substring('/api/posts/'.length));

    try {
      const params: UpdatePostParams = await request.json();

      console.log('[DEBUG] PUT /api/posts/:path - postPath:', postPath);
      console.log('[DEBUG] PUT /api/posts/:path - params:', params);
      console.log('[DEBUG] PUT /api/posts/:path - params.content:', params.content);
      console.log('[DEBUG] PUT /api/posts/:path - params.sha:', params.sha);

      if (!params.content || !params.sha) {
        console.error('[DEBUG] Missing required params:', {
          content: params.content,
          sha: params.sha,
        });
        return new Response(JSON.stringify({ error: 'Content and sha are required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const post = await updatePost(owner, repo, { ...params, path: postPath }, session.accessToken, branch);

      return new Response(JSON.stringify({ data: post }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } catch (error) {
      console.error('Error updating post:', error);
      return new Response(JSON.stringify({ error: 'Failed to update post' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  }

  // DELETE /api/posts/:path - 删除文章
  if (path.startsWith('/api/posts/') && request.method === 'DELETE') {
    // 对路径进行解码，因为 URL 中的路径已经被浏览器编码
    const postPath = decodeURIComponent(path.substring('/api/posts/'.length));
    const sha = url.searchParams.get('sha');

    console.log('[DEBUG] DELETE /api/posts/:path - postPath:', postPath);
    console.log('[DEBUG] DELETE /api/posts/:path - sha:', sha);

    if (!sha) {
      return new Response(JSON.stringify({ error: 'SHA is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    try {
      await deletePost(owner, repo, postPath, sha, session.accessToken, branch);

      return new Response(JSON.stringify({ data: { success: true } }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      return new Response(JSON.stringify({ error: 'Failed to delete post' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  }

  return new Response('Not Found', { status: 404, headers: corsHeaders });
}
