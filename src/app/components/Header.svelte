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

<header class="bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg">
  <div class="container mx-auto px-4 py-4">
    <div class="flex items-center justify-between">
      <!-- Logo -->
      <a
        href="/"
        on:click|preventDefault={() => navigate('/')}
        class="flex items-center space-x-2 text-white hover:text-primary-100 transition"
      >
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        <span class="text-xl font-bold">Hexo 博客管理器</span>
      </a>

      <!-- Desktop Navigation -->
      <nav class="hidden md:flex items-center space-x-6">
        <a
          href="/"
          on:click|preventDefault={() => navigate('/')}
          class="hover:text-primary-200 transition font-medium"
        >
          文章列表
        </a>
        {#if $auth.isAuthenticated}
          <a
            href="/new"
            on:click|preventDefault={() => navigate('/new')}
            class="hover:text-primary-200 transition font-medium"
          >
            新建文章
          </a>
        {/if}
      </nav>

      <!-- User Menu / Login -->
      <div class="flex items-center space-x-4">
        {#if $auth.isAuthenticated}
          <div class="relative hidden md:block">
            <button
              on:click={() => (showUserMenu = !showUserMenu)}
              class="flex items-center space-x-2 focus:outline-none"
            >
              <img
                src={$auth.user?.avatar_url}
                alt={$auth.user?.login}
                class="w-8 h-8 rounded-full border-2 border-white/50"
              />
              <span class="hidden md:inline font-medium">{$auth.user?.login}</span>
              <svg
                class="w-4 h-4 transition-transform {showUserMenu ? 'rotate-180' : ''}"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            <!-- Dropdown Menu -->
            {#if showUserMenu}
              <div class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 text-gray-800">
                <a
                  href="/settings"
                  class="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                  on:click|preventDefault={() => {
                    showUserMenu = false;
                    navigate('/settings');
                  }}
                >
                  设置
                </a>
                <button
                  on:click={handleLogout}
                  class="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition"
                >
                  登出
                </button>
              </div>
            {/if}
          </div>
        {:else}
          <button
            on:click={handleLogin}
            disabled={loginLoading}
            class="hidden md:flex items-center bg-white text-primary-600 hover:bg-primary-50 px-4 py-2 rounded-md transition font-medium shadow-sm disabled:opacity-75"
          >
            {#if loginLoading}
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>登录中...</span>
            {:else}
              <svg class="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fill-rule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clip-rule="evenodd"
                />
              </svg>
              <span>登录</span>
            {/if}
          </button>
        {/if}
      </div>

      <!-- Mobile Menu Button -->
      <button
        class="md:hidden p-1 rounded hover:bg-primary-800/40 transition"
        on:click={() => (showMobileMenu = !showMobileMenu)}
        aria-label="Toggle menu"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {#if showMobileMenu}
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          {:else}
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          {/if}
        </svg>
      </button>
    </div>

    <!-- Mobile Navigation -->
    {#if showMobileMenu}
      <nav class="md:hidden mt-4 pb-4 border-t border-primary-500/60 pt-4 space-y-2">
        <a
          href="/"
          class="block py-2 px-3 rounded hover:bg-primary-800/40 text-white font-medium"
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
            class="block py-2 px-3 rounded hover:bg-primary-800/40 text-white font-medium"
            on:click|preventDefault={() => {
              showMobileMenu = false;
              navigate('/new');
            }}
          >
            新建文章
          </a>
          <a
            href="/settings"
            class="block py-2 px-3 rounded hover:bg-primary-800/40 text-white font-medium"
            on:click|preventDefault={() => {
              showMobileMenu = false;
              navigate('/settings');
            }}
          >
            设置
          </a>
          <button
            on:click={handleLogout}
            class="block w-full text-left py-2 px-3 rounded text-red-200 hover:bg-primary-800/40 hover:text-white transition font-medium"
          >
            登出 ({$auth.user?.login})
          </button>
        {:else}
          <button
            on:click={() => {
              showMobileMenu = false;
              handleLogin();
            }}
            disabled={loginLoading}
            class="w-full text-left py-2 px-3 rounded bg-white text-primary-700 hover:bg-primary-50 font-medium flex items-center transition"
          >
            <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path
                fill-rule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clip-rule="evenodd"
              />
            </svg>
            <span>{loginLoading ? '正在连接 GitHub...' : '使用 GitHub 登录'}</span>
          </button>
        {/if}
      </nav>
    {/if}
  </div>
</header>

<style>
  header {
    position: sticky;
    top: 0;
    z-index: 100;
  }
</style>
