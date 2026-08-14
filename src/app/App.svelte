<script lang="ts">
  import { onMount } from 'svelte';
  import { auth } from '$stores/auth';
  import { authApi } from '$lib/api';
  import { updateAvailable, applyUpdate } from '$lib/pwa';
  import Header from '$components/Header.svelte';
  import HomePage from '$routes/+page.svelte';
  import NewPostPage from '$routes/new/+page.svelte';
  import SettingsPage from '$routes/settings/+page.svelte';
  import EditPage from '$routes/edit/[slug]/+page.svelte';

  let currentPage: string = '';

  onMount(async () => {
    // 检查 URL 中是否有 session 参数
    const urlParams = new URLSearchParams(window.location.search);
    const session = urlParams.get('session');

    if (session) {
      // 保存 session 到 localStorage
      localStorage.setItem('sessionId', session);

      // 清除 URL 中的 session 参数
      window.history.replaceState({}, document.title, window.location.pathname);

      // 调用 API 获取用户信息
      const userResponse = await authApi.getUser();

      if (userResponse.success && userResponse.data) {
        // 使用 auth.setSession() 保存会话信息
        auth.setSession(session, userResponse.data.user);
      } else {
        localStorage.removeItem('sessionId');
      }
    } else {
      // 恢复已保存的会话
      auth.restoreSession();
    }

    // 处理路由
    handleRoute();

    // 监听路由变化
    window.addEventListener('popstate', handleRoute);
  });

  function handleRoute() {
    const path = window.location.pathname;
    // /login 路由重定向到首页
    if (path === '/login') {
      window.history.replaceState({}, '', '/');
      currentPage = '/';
      window.scrollTo(0, 0);
      return;
    }

    currentPage = path;

    // 滚动到顶部
    window.scrollTo(0, 0);
  }

  function navigate(path: string) {
    window.history.pushState({}, '', path);
    handleRoute();
  }
</script>

<div class="min-h-screen flex flex-col bg-[#fbfbfb] text-zinc-900 selection:bg-zinc-200">
  <!-- PWA 更新提示 -->
  {#if $updateAvailable}
    <div class="fixed bottom-5 left-4 right-4 md:left-auto md:right-6 md:w-96 bg-zinc-900 text-white rounded-xl shadow-2xl border border-zinc-700/50 p-4 z-50 animate-slide-up">
      <div class="flex items-start gap-3">
        <div class="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 text-white mt-0.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <h3 class="text-sm font-semibold text-white">发现新版本</h3>
          <p class="text-xs text-zinc-400 mt-0.5 leading-relaxed">应用已有新内容，点击立即刷新载入最新版。</p>
        </div>
      </div>
      <div class="flex items-center gap-2 mt-3.5 pt-2 border-t border-zinc-800">
        <button
          on:click={applyUpdate}
          class="flex-1 bg-white text-zinc-950 hover:bg-zinc-100 text-xs font-semibold py-2 px-3 rounded-lg transition"
        >
          立即更新
        </button>
        <button
          on:click={() => updateAvailable.set(false)}
          class="px-3 py-2 text-xs text-zinc-400 hover:text-white transition"
        >
          稍后
        </button>
      </div>
    </div>
  {/if}

  <Header {navigate} />

  <main class="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 md:py-10">
    {#if currentPage === '/' || currentPage === '' || currentPage === '/login'}
      <HomePage {navigate} />
    {:else if currentPage === '/new'}
      <NewPostPage {navigate} />
    {:else if currentPage === '/settings'}
      <SettingsPage {navigate} />
    {:else if currentPage.startsWith('/edit/')}
      <EditPage {navigate} />
    {:else}
      <div class="text-center py-20">
        <span class="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-400">404 Error</span>
        <h1 class="text-3xl font-bold tracking-tight text-zinc-900 mt-2 mb-3">页面未找到</h1>
        <p class="text-zinc-500 text-sm max-w-sm mx-auto mb-6">抱歉，您访问的页面不存在或已被移除。</p>
        <button
          on:click={() => navigate('/')}
          class="bg-zinc-900 hover:bg-black text-white text-sm font-medium px-4 py-2 rounded-lg transition shadow-sm"
        >
          返回文章列表
        </button>
      </div>
    {/if}
  </main>

  <footer class="border-t border-zinc-200/80 bg-white py-6 mt-12">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-600">
      <div class="flex items-center space-x-2">
        <span class="font-medium text-zinc-700">BlogWriter</span>
        <span>&copy; {new Date().getFullYear()}</span>
      </div>
      <p class="text-zinc-600 font-mono text-[11px]">
        Cloudflare Workers & Svelte
      </p>
    </div>
  </footer>
</div>
