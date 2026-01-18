import { writable } from 'svelte/store';
import type { GitHubUser } from '$shared/types';

interface AuthState {
  isAuthenticated: boolean;
  user: GitHubUser | null;
  sessionId: string | null;
  repo: {
    owner: string;
    name: string;
  } | null;
}

function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>({
    isAuthenticated: false,
    user: null,
    sessionId: null,
    repo: null,
  });

  // 从 localStorage 恢复会话
  function restoreSession() {
    const sessionId = localStorage.getItem('sessionId');
    const userJson = localStorage.getItem('user');
    const repoJson = localStorage.getItem('repo');

    if (sessionId && userJson) {
      update((state) => ({
        ...state,
        isAuthenticated: true,
        sessionId,
        user: JSON.parse(userJson),
        repo: repoJson ? JSON.parse(repoJson) : null,
      }));
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

    update((state) => ({
      ...state,
      isAuthenticated: false,
      user: null,
      sessionId: null,
      repo: null,
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

  return {
    subscribe,
    restoreSession,
    setSession,
    clearSession,
    setRepo,
  };
}

export const auth = createAuthStore();
