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
  const { subscribe, set, update } = writable<AuthState>({
    isAuthenticated: false,
    user: null,
    sessionId: null,
    repo: null,
    postsPath: 'source/_posts',
    s3Config: null,
  });

  // 从 localStorage 恢复会话
  function restoreSession() {
    console.log('🔍 [Auth Store Debug] restoreSession() 被调用');
    const sessionId = localStorage.getItem('sessionId');
    const userJson = localStorage.getItem('user');
    const repoJson = localStorage.getItem('repo');
    const postsPath = localStorage.getItem('postsPath') || 'source/_posts';
    const s3ConfigJson = localStorage.getItem('s3Config');

    console.log('  - sessionId:', sessionId);
    console.log('  - userJson:', userJson);
    console.log('  - repoJson:', repoJson);
    console.log('  - postsPath:', postsPath);
    console.log('  - s3Config:', s3ConfigJson ? '已配置' : '未配置');

    if (sessionId && userJson) {
      console.log('✅ [Auth Store Debug] sessionId 和 user 都存在，恢复会话');
      update((state) => ({
        ...state,
        isAuthenticated: true,
        sessionId,
        user: JSON.parse(userJson),
        repo: repoJson ? JSON.parse(repoJson) : null,
        postsPath,
        s3Config: s3ConfigJson ? JSON.parse(s3ConfigJson) : null,
      }));
    } else {
      console.log('❌ [Auth Store Debug] 无法恢复会话:');
      if (!sessionId) console.log('  - 缺少 sessionId');
      if (!userJson) console.log('  - 缺少 userJson');
      // 即使未登录也恢复 S3 配置
      if (s3ConfigJson) {
        update((state) => ({
          ...state,
          s3Config: JSON.parse(s3ConfigJson),
        }));
      }
    }
  }

  // 设置会话
  function setSession(sessionId: string, user: GitHubUser, repo?: { owner: string; name: string }) {
    localStorage.setItem('sessionId', sessionId);
    localStorage.setItem('user', JSON.stringify(user));
    if (repo) {
      localStorage.setItem('repo', JSON.stringify(repo));
    }

    update((state) => ({
      ...state,
      isAuthenticated: true,
      sessionId,
      user,
      repo: repo || state.repo,
    }));
  }

  // 清除会话
  function clearSession() {
    localStorage.removeItem('sessionId');
    localStorage.removeItem('user');
    localStorage.removeItem('repo');
    localStorage.removeItem('postsPath');

    update((state) => ({
      ...state,
      isAuthenticated: false,
      user: null,
      sessionId: null,
      repo: null,
      postsPath: 'source/_posts',
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
