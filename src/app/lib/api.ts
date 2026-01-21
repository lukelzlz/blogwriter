import { auth } from '$stores/auth';
import type { Post, CreatePostParams, UpdatePostParams, ApiResponse, ImageUploadParams, ImageUploadResponse, S3Config } from '$shared/types';

// API 基础 URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// 对路径进行 URL 编码，保留斜杠
// 这样可以正确处理包含特殊字符（如 %）的文件名
function encodePathForUrl(path: string): string {
  return path.split('/').map(segment => encodeURIComponent(segment)).join('/');
}

// 获取认证头
function getAuthHeaders(): HeadersInit {
  const sessionId = localStorage.getItem('sessionId');
  return {
    'Content-Type': 'application/json',
    'Authorization': sessionId ? `Bearer ${sessionId}` : '',
  };
}

// 通用请求函数
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Request failed',
      };
    }

    // 自动解包后端返回的 { data: ... } 结构
    // 后端统一返回 { data: T } 格式，这里解包为 T
    const unwrappedData = data.data !== undefined ? data.data : data;

    return {
      success: true,
      data: unwrappedData,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// 认证 API
export const authApi = {
  // 获取 GitHub OAuth 授权 URL
  async getGitHubAuthUrl() {
    return request<{ url: string }>('/auth/github');
  },

  // 获取当前用户信息
  async getUser() {
    return request<{ user: any }>('/auth/user');
  },

  // 登出
  async logout() {
    return request<{ success: boolean }>('/auth/logout', {
      method: 'POST',
    });
  },
};

// 文章 API
export const postsApi = {
  // 获取文章列表
  async getList(params?: { path?: string; branch?: string; owner?: string; repo?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.path) queryParams.set('path', params.path);
    if (params?.branch) queryParams.set('branch', params.branch);
    if (params?.owner) queryParams.set('owner', params.owner);
    if (params?.repo) queryParams.set('repo', params.repo);

    return request<Post[]>(`/api/posts?${queryParams.toString()}`);
  },

  // 获取单个文章
  async get(path: string, branch?: string, owner?: string, repo?: string) {
    const queryParams = new URLSearchParams();
    if (branch) queryParams.set('branch', branch);
    if (owner) queryParams.set('owner', owner);
    if (repo) queryParams.set('repo', repo);

    return request<Post>(`/api/posts/${encodePathForUrl(path)}?${queryParams.toString()}`);
  },

  // 创建文章
  async create(params: CreatePostParams, branch?: string, owner?: string, repo?: string) {
    const queryParams = new URLSearchParams();
    if (branch) queryParams.set('branch', branch);
    if (owner) queryParams.set('owner', owner);
    if (repo) queryParams.set('repo', repo);

    return request<Post>(`/api/posts?${queryParams.toString()}`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // 更新文章
  async update(path: string, params: UpdatePostParams, branch?: string, owner?: string, repo?: string) {
    console.log('[DEBUG] postsApi.update called with:', { path, params, branch, owner, repo });

    const queryParams = new URLSearchParams();
    if (branch) queryParams.set('branch', branch);
    if (owner) queryParams.set('owner', owner);
    if (repo) queryParams.set('repo', repo);

    const url = `/api/posts/${encodePathForUrl(path)}?${queryParams.toString()}`;
    console.log('[DEBUG] Request URL:', url);
    console.log('[DEBUG] Request body:', JSON.stringify(params));

    return request<Post>(url, {
      method: 'PUT',
      body: JSON.stringify(params),
    });
  },

  // 删除文章
  async delete(path: string, sha: string, branch?: string, owner?: string, repo?: string) {
    const queryParams = new URLSearchParams({ sha });
    if (branch) queryParams.set('branch', branch);
    if (owner) queryParams.set('owner', owner);
    if (repo) queryParams.set('repo', repo);

    return request<{ success: boolean }>(`/api/posts/${encodePathForUrl(path)}?${queryParams.toString()}`, {
      method: 'DELETE',
    });
  },
};

// 仓库 API
export const repoApi = {
  // 获取仓库信息
  async getInfo(owner: string, repo: string) {
    return request<any>(`/api/repo?owner=${owner}&repo=${repo}`);
  },

  // 获取分支列表
  async getBranches(owner: string, repo: string) {
    return request<any[]>(`/api/repo/branches?owner=${owner}&repo=${repo}`);
  },
};

// 图片上传 API
export const imageApi = {
  // 上传图片到 S3 兼容存储（支持进度回调）
  upload(
    params: ImageUploadParams,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<ImageUploadResponse>> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      const url = `${API_BASE_URL}/api/upload`;
      
      // 监听上传进度
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });
      
      // 监听完成
      xhr.addEventListener('load', () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            const unwrappedData = data.data !== undefined ? data.data : data;
            resolve({ success: true, data: unwrappedData });
          } else {
            resolve({ success: false, error: data.error || 'Upload failed' });
          }
        } catch {
          resolve({ success: false, error: 'Invalid response' });
        }
      });
      
      // 监听错误
      xhr.addEventListener('error', () => {
        resolve({ success: false, error: 'Network error' });
      });
      
      // 监听超时
      xhr.addEventListener('timeout', () => {
        resolve({ success: false, error: 'Request timeout' });
      });
      
      // 发送请求
      xhr.open('POST', url);
      xhr.setRequestHeader('Content-Type', 'application/json');
      const sessionId = localStorage.getItem('sessionId');
      if (sessionId) {
        xhr.setRequestHeader('Authorization', `Bearer ${sessionId}`);
      }
      xhr.timeout = 120000; // 2分钟超时
      xhr.send(JSON.stringify(params));
    });
  },

  // 删除图片
  async delete(key: string, config: S3Config): Promise<ApiResponse<{ success: boolean }>> {
    return request<{ success: boolean }>('/api/upload/delete', {
      method: 'POST',
      body: JSON.stringify({ key, config }),
    });
  },
};
