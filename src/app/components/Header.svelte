<script lang="ts">
  import { auth } from '$stores/auth';
  import { authApi } from '$lib/api';

  export let navigate: (path: string) => void = () => {};

  let showUserMenu = false;
  let showMobileMenu = false;
  let loginLoading = false;

  async function handleLogin() {
    if (loginLoading) return;
    loginLoading = true;

    try {
      const response = await authApi.getGitHubAuthUrl();
      if (response.success && response.data?.url) {
        window.location.href = response.data.url;
      } else {
        alert(response.error || '获取登录授权失败，请重试');
        loginLoading = false;
      }
    } catch (err) {
      console.error('Login error:', err);
      alert('登录失败，请重试');
      loginLoading = false;
    }
  }

  async function handleLogout() {
    await authApi.logout();
    auth.clearSession();
    showUserMenu = false;
    showMobileMenu = false;
    navigate('/');
  }
</script>

<header class="bg-white/95 backdrop-blur-md border-b border-zinc-200 sticky top-0 z-40">
  <div class="max-w-5xl mx-auto px-4 sm:px-6">
    <div class="flex items-center justify-between h-16">
      <!-- Logo -->
      <a
        href="/"
        on:click|preventDefault={() => navigate('/')}
        class="flex items-center space-x-2.5 text-zinc-900 hover:opacity-80 transition group"
      >
        <div class="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-white shadow-sm group-hover:bg-black transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <div class="flex flex-col">
          <span class="text-base font-bold tracking-tight text-zinc-900">BlogWriter</span>
          <span class="text-[10px] text-zinc-600 font-mono -mt-1 tracking-normal">Hexo Manager</span>
        </div>
      </a>

      <!-- Desktop Navigation -->
      <nav class="hidden md:flex items-center space-x-1 text-sm font-medium">
        <a
          href="/"
          on:click|preventDefault={() => navigate('/')}
          class="px-3.5 py-1.5 rounded-md text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition"
        >
          文章列表
        </a>
        {#if $auth.isAuthenticated}
          <a
            href="/new"
            on:click|preventDefault={() => navigate('/new')}
            class="px-3.5 py-1.5 rounded-md text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100 transition"
          >
            新建文章
          </a>
        {/if}
      </nav>

      <!-- User Menu / Login -->
      <div class="flex items-center space-x-3">
        {#if $auth.isAuthenticated}
          <div class="relative hidden md:block">
            <button
              on:click={() => (showUserMenu = !showUserMenu)}
              class="flex items-center space-x-2 p-1.5 pr-2.5 rounded-full border border-zinc-200 hover:border-zinc-300 bg-white hover:bg-zinc-50 transition text-zinc-800 focus:outline-none"
            >
              <img
                src={$auth.user?.avatar_url}
                alt={$auth.user?.login}
                class="w-6 h-6 rounded-full bg-zinc-100 object-cover"
              />
              <span class="text-xs font-medium text-zinc-800 max-w-[120px] truncate">{$auth.user?.login}</span>
              <svg
                class="w-3.5 h-3.5 text-zinc-400 transition-transform {showUserMenu ? 'rotate-180' : ''}"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <!-- Dropdown Menu -->
            {#if showUserMenu}
              <!-- 点击外部遮罩 -->
              <button
                class="fixed inset-0 z-40 bg-transparent border-0 cursor-default"
                on:click={() => (showUserMenu = false)}
                aria-label="关闭菜单"
              ></button>
              
              <div class="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-zinc-200 py-1.5 z-50 text-zinc-800 animate-fade-in">
                <div class="px-3.5 py-2 border-b border-zinc-100 mb-1">
                  <p class="text-[11px] text-zinc-600 uppercase tracking-wider font-semibold">登录身份</p>
                  <p class="text-sm font-semibold text-zinc-900 truncate">{$auth.user?.login}</p>
                </div>
                <a
                  href="/settings"
                  class="flex items-center gap-2 px-3.5 py-2 text-sm text-zinc-700 hover:bg-zinc-100 transition"
                  on:click|preventDefault={() => {
                    showUserMenu = false;
                    navigate('/settings');
                  }}
                >
                  <svg class="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>配置与设置</span>
                </a>
                <button
                  on:click={handleLogout}
                  class="flex items-center gap-2 w-full text-left px-3.5 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                >
                  <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>退出登录</span>
                </button>
              </div>
            {/if}
          </div>
        {:else}
          <button
            on:click={handleLogin}
            disabled={loginLoading}
            class="hidden md:flex items-center bg-zinc-900 hover:bg-black text-white text-xs font-medium px-3.5 py-2 rounded-lg transition shadow-sm active:scale-95 disabled:opacity-60"
          >
            {#if loginLoading}
              <div class="loading mr-1.5 !w-3 !h-3 !border-white/40 !border-t-white"></div>
              <span>连接中...</span>
            {:else}
              <svg class="w-3.5 h-3.5 mr-1.5 fill-current" viewBox="0 0 24 24">
                <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
              </svg>
              <span>GitHub 登录</span>
            {/if}
          </button>
        {/if}

        <!-- Mobile Menu Button (44px min touch target) -->
        <button
          class="md:hidden w-10 h-10 flex items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 transition"
          on:click={() => (showMobileMenu = !showMobileMenu)}
          aria-label="Toggle menu"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {#if showMobileMenu}
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            {:else}
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            {/if}
          </svg>
        </button>
      </div>
    </div>

    <!-- Mobile Navigation Drawer -->
    {#if showMobileMenu}
      <nav class="md:hidden py-3 border-t border-zinc-100 space-y-1 animate-fade-in">
        <a
          href="/"
          class="flex items-center min-h-[44px] px-3.5 rounded-lg text-sm font-medium text-zinc-800 hover:bg-zinc-100 active:bg-zinc-200 transition"
          on:click|preventDefault={() => {
            showMobileMenu = false;
            navigate('/');
          }}
        >
          文章列表
        </a>
        {#if $auth.isAuthenticated}
          <a
            href="/new"
            class="flex items-center min-h-[44px] px-3.5 rounded-lg text-sm font-medium text-zinc-800 hover:bg-zinc-100 active:bg-zinc-200 transition"
            on:click|preventDefault={() => {
              showMobileMenu = false;
              navigate('/new');
            }}
          >
            新建文章
          </a>
          <a
            href="/settings"
            class="flex items-center min-h-[44px] px-3.5 rounded-lg text-sm font-medium text-zinc-800 hover:bg-zinc-100 active:bg-zinc-200 transition"
            on:click|preventDefault={() => {
              showMobileMenu = false;
              navigate('/settings');
            }}
          >
            设置与配置
          </a>
          <button
            on:click={handleLogout}
            class="flex items-center min-h-[44px] w-full px-3.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 active:bg-red-100 transition"
          >
            退出登录 ({$auth.user?.login})
          </button>
        {:else}
          <button
            on:click={() => {
              showMobileMenu = false;
              handleLogin();
            }}
            disabled={loginLoading}
            class="flex items-center justify-center min-h-[44px] w-full px-3.5 rounded-lg text-sm font-medium bg-zinc-900 text-white hover:bg-black transition mt-2"
          >
            <svg class="w-4 h-4 mr-2 fill-current" viewBox="0 0 24 24">
              <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
            </svg>
            <span>{loginLoading ? '正在连接 GitHub...' : '使用 GitHub 账号登录'}</span>
          </button>
        {/if}
      </nav>
    {/if}
  </div>
</header>
