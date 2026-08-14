import { writable } from 'svelte/store';
import type { GitHubUser, S3Config } from '$shared/types';

interface AuthState {
  isAuthenticated: boolean;
  user: GitHubUser | null;
  sessionId: string | null;
  repo: {
    owner: string;
    name: string;
  } | null;
  postsPath: string;
  s3Config: S3Config | null;
}

function createAuthStore() {
  const { subscribe, update } = writable<AuthState>({
    isAuthenticated: false,
    user: null,
    sessionId: null,
    repo: null,
    postsPath: 'source/_posts',
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
    const repo = repoJson ? JSON.parse(repoJson) : null;

    if (sessionId && userJson) {
      update((state) => ({
        ...state,
        isAuthenticated: true,
        sessionId,
        user: JSON.parse(userJson),
        repo,
        postsPath,
        s3Config,
      }));
    } else {
      // 未登录时也恢复已保存的仓库与 S3 配置
      update((state) => ({
        ...state,
        isAuthenticated: false,
        user: null,
        sessionId: null,
        repo: repo || state.repo,
        postsPath: postsPath || state.postsPath,
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

    update((state) => ({
      ...state,
      isAuthenticated: true,
      sessionId,
      user,
      repo: savedRepo || state.repo,
      postsPath: state.postsPath !== 'source/_posts' ? state.postsPath : savedPostsPath,
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
      localStorage.removeItem('s3Config');
    }

    update((state) => ({
      ...state,
      isAuthenticated: false,
      user: null,
      sessionId: null,
      ...(clearConfig ? { repo: null, postsPath: 'source/_posts', s3Config: null } : {}),
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
    setS3Config,
    getS3Config,
  };
}

export const auth = createAuthStore();
