import { writable } from 'svelte/store';
import type { GitHubUser, S3Config, ImageStorageProvider, GitHubImageConfig } from '$shared/types';

interface AuthState {
  isAuthenticated: boolean;
  user: GitHubUser | null;
  sessionId: string | null;
  repo: {
    owner: string;
    name: string;
  } | null;
  postsPath: string;
  imageStorageProvider: ImageStorageProvider;
  githubImageConfig: GitHubImageConfig;
  s3Config: S3Config | null;
}

const DEFAULT_GITHUB_IMAGE_CONFIG: GitHubImageConfig = {
  pathPrefix: 'source/images',
};

function createAuthStore() {
  const { subscribe, update } = writable<AuthState>({
    isAuthenticated: false,
    user: null,
    sessionId: null,
    repo: null,
    postsPath: 'source/_posts',
    imageStorageProvider: 'github',
    githubImageConfig: DEFAULT_GITHUB_IMAGE_CONFIG,
    s3Config: null,
  });

  // 从 localStorage 恢复会话与配置
  function restoreSession() {
    const sessionId = localStorage.getItem('sessionId');
    const userJson = localStorage.getItem('user');
    const repoJson = localStorage.getItem('repo');
    const postsPath = localStorage.getItem('postsPath') || 'source/_posts';
    const s3ConfigJson = localStorage.getItem('s3Config');
    const s3Config = s3ConfigJson ? JSON.parse(s3ConfigJson) : null;
    const provider = (localStorage.getItem('imageStorageProvider') as ImageStorageProvider) || (s3Config ? 's3' : 'github');
    const githubImageConfigJson = localStorage.getItem('githubImageConfig');

    const githubImageConfig = githubImageConfigJson ? JSON.parse(githubImageConfigJson) : DEFAULT_GITHUB_IMAGE_CONFIG;
    const repo = repoJson ? JSON.parse(repoJson) : null;

    if (sessionId && userJson) {
      update((state) => ({
        ...state,
        isAuthenticated: true,
        sessionId,
        user: JSON.parse(userJson),
        repo,
        postsPath,
        imageStorageProvider: provider,
        githubImageConfig,
        s3Config,
      }));
    } else {
      // 未登录时也恢复已保存的仓库与图床配置
      update((state) => ({
        ...state,
        isAuthenticated: false,
        user: null,
        sessionId: null,
        repo: repo || state.repo,
        postsPath: postsPath || state.postsPath,
        imageStorageProvider: provider || state.imageStorageProvider,
        githubImageConfig: githubImageConfig || state.githubImageConfig,
        s3Config: s3Config || state.s3Config,
      }));
    }
  }

  // 设置会话并保留现有配置
  function setSession(sessionId: string, user: GitHubUser, repo?: { owner: string; name: string }) {
    localStorage.setItem('sessionId', sessionId);
    localStorage.setItem('user', JSON.stringify(user));
    if (repo) {
      localStorage.setItem('repo', JSON.stringify(repo));
    }

    const savedRepoJson = localStorage.getItem('repo');
    const savedRepo = repo || (savedRepoJson ? JSON.parse(savedRepoJson) : null);
    const savedPostsPath = localStorage.getItem('postsPath') || 'source/_posts';
    const savedS3ConfigJson = localStorage.getItem('s3Config');
    const savedS3Config = savedS3ConfigJson ? JSON.parse(savedS3ConfigJson) : null;
    const savedProvider = (localStorage.getItem('imageStorageProvider') as ImageStorageProvider) || (savedS3Config ? 's3' : 'github');
    const savedGhConfigJson = localStorage.getItem('githubImageConfig');

    const savedGhConfig = savedGhConfigJson ? JSON.parse(savedGhConfigJson) : DEFAULT_GITHUB_IMAGE_CONFIG;

    update((state) => ({
      ...state,
      isAuthenticated: true,
      sessionId,
      user,
      repo: savedRepo || state.repo,
      postsPath: state.postsPath !== 'source/_posts' ? state.postsPath : savedPostsPath,
      imageStorageProvider: savedProvider,
      githubImageConfig: savedGhConfig,
      s3Config: state.s3Config || savedS3Config,
    }));
  }

  // 清除会话（默认保留仓库与图床配置，仅清除登录凭证）
  function clearSession(clearConfig: boolean = false) {
    localStorage.removeItem('sessionId');
    localStorage.removeItem('user');
    if (clearConfig) {
      localStorage.removeItem('repo');
      localStorage.removeItem('postsPath');
      localStorage.removeItem('imageStorageProvider');
      localStorage.removeItem('githubImageConfig');
      localStorage.removeItem('s3Config');
    }

    update((state) => ({
      ...state,
      isAuthenticated: false,
      user: null,
      sessionId: null,
      ...(clearConfig ? {
        repo: null,
        postsPath: 'source/_posts',
        imageStorageProvider: 'github',
        githubImageConfig: DEFAULT_GITHUB_IMAGE_CONFIG,
        s3Config: null
      } : {}),
    }));
  }

  // 设置仓库
  function setRepo(owner: string, name: string) {
    const repo = { owner, name };
    localStorage.setItem('repo', JSON.stringify(repo));
    update((state) => ({
      ...state,
      repo,
    }));
  }

  // 设置文章路径
  function setPostsPath(postsPath: string) {
    localStorage.setItem('postsPath', postsPath);
    update((state) => ({
      ...state,
      postsPath,
    }));
  }

  // 设置图床服务商 (github / s3)
  function setImageStorageProvider(provider: ImageStorageProvider) {
    localStorage.setItem('imageStorageProvider', provider);
    update((state) => ({
      ...state,
      imageStorageProvider: provider,
    }));
  }

  // 设置 GitHub 图床配置
  function setGitHubImageConfig(config: GitHubImageConfig) {
    localStorage.setItem('githubImageConfig', JSON.stringify(config));
    update((state) => ({
      ...state,
      githubImageConfig: config,
    }));
  }

  // 设置 S3 配置
  function setS3Config(config: S3Config | null) {
    if (config) {
      localStorage.setItem('s3Config', JSON.stringify(config));
    } else {
      localStorage.removeItem('s3Config');
    }
    update((state) => ({
      ...state,
      s3Config: config,
    }));
  }

  // 获取 S3 配置
  function getS3Config(): S3Config | null {
    const s3ConfigJson = localStorage.getItem('s3Config');
    return s3ConfigJson ? JSON.parse(s3ConfigJson) : null;
  }

  return {
    subscribe,
    restoreSession,
    setSession,
    clearSession,
    setRepo,
    setPostsPath,
    setImageStorageProvider,
    setGitHubImageConfig,
    setS3Config,
    getS3Config,
  };
}

export const auth = createAuthStore();

