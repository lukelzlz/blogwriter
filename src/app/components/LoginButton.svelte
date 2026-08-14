<script lang="ts">
  import { authApi } from '$lib/api';

  let loading = false;
  let error = '';

  async function handleLogin() {
    loading = true;
    error = '';

    try {
      const response = await authApi.getGitHubAuthUrl();
      
      if (response.success && response.data) {
        // 重定向到 GitHub 授权页面
        window.location.href = response.data.url;
      } else {
        error = response.error || '登录失败，请重试';
      }
    } catch (err) {
      error = '登录失败，请重试';
      console.error('Login error:', err);
    } finally {
      loading = false;
    }
  }
</script>

<div class="login-container">
  {#if error}
    <div class="bg-zinc-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-4 flex items-center justify-between animate-fade-in">
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke-width="2"/>
          <line x1="12" y1="8" x2="12" y2="12" stroke-width="2"/>
          <line x1="12" y1="16" x2="12.01" y2="16" stroke-width="2"/>
        </svg>
        <span>{error}</span>
      </div>
      <button on:click={() => (error = '')} class="text-zinc-400 hover:text-zinc-700 ml-2 text-xs p-1">✕</button>
    </div>
  {/if}

  <button
    on:click={handleLogin}
    disabled={loading}
    class="github-login-btn flex items-center justify-center w-full bg-zinc-900 hover:bg-black text-white font-medium py-3 px-5 rounded-lg transition-all shadow-sm hover:shadow active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer tracking-tight"
  >
    {#if loading}
      <div class="loading mr-2.5"></div>
      <span>正在连接 GitHub...</span>
    {:else}
      <svg class="w-5 h-5 mr-2.5 text-white fill-current" viewBox="0 0 24 24">
        <path
          fill-rule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          clip-rule="evenodd"
        />
      </svg>
      <span>使用 GitHub 账号登录</span>
    {/if}
  </button>

  <p class="text-center text-xs text-zinc-400 mt-3 font-normal">
    基于 GitHub OAuth 授权，文章与图片直连写入你的 Hexo 仓库
  </p>
</div>

<style>
  .login-container {
    max-width: 380px;
    margin: 0 auto;
  }
</style>
