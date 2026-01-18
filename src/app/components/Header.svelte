<script lang="ts">
  import { auth } from '$stores/auth';
  import { authApi } from '$lib/api';

  let showMenu = false;

  async function handleLogout() {
    await authApi.logout();
    auth.clearSession();
    showMenu = false;
  }
</script>

<header class="bg-gray-900 text-white shadow-md">
  <div class="container mx-auto px-4 py-4">
    <div class="flex items-center justify-between">
      <!-- Logo -->
      <div class="flex items-center space-x-2">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
        <span class="text-xl font-bold">Hexo 博客管理器</span>
      </div>

      <!-- Desktop Navigation -->
      <nav class="hidden md:flex items-center space-x-6">
        <a href="/" class="hover:text-gray-300 transition">文章列表</a>
        {#if $auth.isAuthenticated}
          <a href="/new" class="hover:text-gray-300 transition">新建文章</a>
        {/if}
      </nav>

      <!-- User Menu -->
      <div class="flex items-center space-x-4">
        {#if $auth.isAuthenticated}
          <div class="relative">
            <button
              on:click={() => (showMenu = !showMenu)}
              class="flex items-center space-x-2 focus:outline-none"
            >
              <img
                src={$auth.user?.avatar_url}
                alt={$auth.user?.login}
                class="w-8 h-8 rounded-full"
              />
              <span class="hidden md:inline">{$auth.user?.login}</span>
              <svg
                class="w-4 h-4 transition-transform {showMenu ? 'rotate-180' : ''}"
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
            {#if showMenu}
              <div class="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                <a
                  href="/settings"
                  class="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                  on:click={() => (showMenu = false)}
                >
                  设置
                </a>
                <button
                  on:click={handleLogout}
                  class="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                >
                  登出
                </button>
              </div>
            {/if}
          </div>
        {:else}
          <a
            href="/login"
            class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md transition"
          >
            登录
          </a>
        {/if}
      </div>

      <!-- Mobile Menu Button -->
      <button
        class="md:hidden"
        on:click={() => (showMenu = !showMenu)}
        aria-label="Toggle menu"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
    </div>

    <!-- Mobile Navigation -->
    {#if showMenu}
      <nav class="md:hidden mt-4 pb-4 border-t border-gray-700 pt-4">
        <a href="/" class="block py-2 hover:text-gray-300" on:click={() => (showMenu = false)}
          >文章列表</a
        >
        {#if $auth.isAuthenticated}
          <a
            href="/new"
            class="block py-2 hover:text-gray-300"
            on:click={() => (showMenu = false)}
          >
            新建文章
          </a>
          <a
            href="/settings"
            class="block py-2 hover:text-gray-300"
            on:click={() => (showMenu = false)}
          >
            设置
          </a>
          <button
            on:click={handleLogout}
            class="block w-full text-left py-2 text-red-400 hover:text-red-300"
          >
            登出
          </button>
        {:else}
          <a
            href="/login"
            class="block py-2 text-blue-400 hover:text-blue-300"
            on:click={() => (showMenu = false)}
          >
            登录
          </a>
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
