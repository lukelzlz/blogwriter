// 文章数据结构
export interface Post {
  path: string;           // 文件路径，如 _posts/hello-world.md
  name: string;           // 文件名
  sha: string;            // Git SHA
  size: number;           // 文件大小
  url: string;            // 文件 URL
  content?: string;       // 文件内容（纯文本，已从 Base64 解码）
  frontMatter?: {
    title: string;
    date: string;
  };
}

// GitHub 用户信息
export interface GitHubUser {
  id: number;
  login: string;
  name?: string;          // 用户显示名称（可选）
  avatar_url: string;
  email?: string;
}

// 用户会话数据结构
export interface UserSession {
  accessToken: string;
  refreshToken?: string;
  user: GitHubUser;       // 使用 GitHubUser 类型保持一致性
  repo?: {
    owner: string;
    name: string;
  };
  expiresAt: number;
}

// GitHub 仓库信息
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  default_branch: string;
}

// GitHub 文件内容
export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
  _links: any;
}

// API 响应包装
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 文章列表查询参数
export interface PostListParams {
  page?: number;
  per_page?: number;
  search?: string;
}

// 创建文章参数
export interface CreatePostParams {
  title: string;
  content: string;
  path?: string;
}

// 更新文章参数
export interface UpdatePostParams {
  path: string;
  content: string;
  sha: string;
}
