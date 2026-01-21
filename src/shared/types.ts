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

// S3 兼容存储配置
export interface S3Config {
  provider: string;           // 服务商标识：aws, aliyun, tencent, qiniu, r2, minio, custom
  endpoint: string;           // S3 endpoint URL
  region: string;             // 区域
  accessKeyId: string;        // Access Key ID
  secretAccessKey: string;    // Secret Access Key
  bucket: string;             // 存储桶名称
  publicUrl: string;          // 公开访问 URL 前缀（CDN 域名）
  pathPrefix: string;         // 路径前缀，如 blog/images
  forcePathStyle: boolean;    // 是否使用路径风格（MinIO 等需要）
  urlSuffix?: string;         // URL 后缀，如 -ys（用于 CDN 图片处理样式）
}

// 预设服务商配置
export interface S3ProviderPreset {
  name: string;               // 显示名称
  regions: Array<{
    id: string;
    name: string;
    endpoint: string;
  }>;
  forcePathStyle: boolean;
}

// 图片上传请求参数
export interface ImageUploadParams {
  imageData: string;          // Base64 编码的图片数据
  mimeType: string;           // MIME 类型，如 image/png
  config: S3Config;           // S3 配置
}

// 图片上传响应
export interface ImageUploadResponse {
  url: string;                // 图片访问 URL
  key: string;                // 存储 key
}
