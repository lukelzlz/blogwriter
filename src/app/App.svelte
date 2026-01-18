<script lang="ts">
  import { onMount } from 'svelte';
  import { auth } from '$stores/auth';
  import Header from '$components/Header.svelte';
  import HomePage from '$routes/+page.svelte';
  import LoginPage from '$routes/login/+page.svelte';
  import NewPostPage from '$routes/new/+page.svelte';
  import SettingsPage from '$routes/settings/+page.svelte';
  import EditPage from '$routes/edit/[slug]/+page.svelte';

  let currentPage: string = '';

  onMount(() => {
    // 检查 URL 中是否有 session 参数
    const urlParams = new URLSearchParams(window.location.search);
    const session = urlParams.get('session');

    if (session) {
      // 保存 session 到 localStorage
      localStorage.setItem('sessionId', session);
      // 清除 URL 中的 session 参数
      window.history.replaceState({}, document.title, window.location.pathname);
      // 恢复会话
      auth.restoreSession();
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
    currentPage = path;

    // 滚动到顶部
    window.scrollTo(0, 0);
  }

  function navigate(path: string) {
    window.history.pushState({}, '', path);
    handleRoute();
  }
</script>

<div class="min-h-screen bg-gray-50">
  <Header />

  <main class="container mx-auto px-4 py-8">
    {#if currentPage === '/' || currentPage === ''}
      <HomePage {navigate} />
    {:else if currentPage === '/login'}
      <LoginPage {navigate} />
    {:else if currentPage === '/new'}
      <NewPostPage {navigate} />
    {:else if currentPage === '/settings'}
      <SettingsPage {navigate} />
    {:else if currentPage.startsWith('/edit/')}
      <EditPage {navigate} />
    {:else}
      <div class="text-center py-12">
        <h1 class="text-2xl font-bold text-gray-900 mb-4">404 - 页面未找到</h1>
        <p class="text-gray-600 mb-6">抱歉，您访问的页面不存在</p>
        <button
          on:click={() => navigate('/')}
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition"
        >
          返回首页
        </button>
      </div>
    {/if}
  </main>

  <footer class="bg-gray-900 text-gray-400 py-6 mt-12">
    <div class="container mx-auto px-4 text-center">
      <p class="text-sm">
        Hexo 博客管理器 &copy; {new Date().getFullYear()}
      </p>
      <p class="text-xs mt-2">
        基于 Cloudflare Workers 和 Svelte 构建
      </p>
    </div>
  </footer>
</div>
