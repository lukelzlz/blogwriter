<script lang="ts">
  import { onMount } from 'svelte';
  import { auth } from '$stores/auth';
  import { posts } from '$stores/posts';
  import { postsApi } from '$lib/api';
  import PostList from '$components/PostList.svelte';
  import LoginButton from '$components/LoginButton.svelte';

  export let navigate: (path: string) => void = () => {};
  let hasLoaded = false;

  async function loadPostsIfNeeded() {
    if (hasLoaded) return;

    if ($auth.isAuthenticated && $auth.repo) {
      console.log('[DEBUG] Loading posts (auth state ready)');
      await loadPosts();
      hasLoaded = true;
    }
  }

  onMount(async () => {
    console.log('[DEBUG] onMount called');
    console.log('[DEBUG] isAuthenticated:', $auth.isAuthenticated);
    console.log('[DEBUG] repo:', $auth.repo);
    console.log('[DEBUG] postsPath:', $auth.postsPath);

    await loadPostsIfNeeded();
  });

  // 响应式监听 auth 状态变化
  $: if ($auth.isAuthenticated && $auth.repo) {
    console.log('[DEBUG] Auth state changed, checking if posts need to be loaded');
    loadPostsIfNeeded();
  }

  async function loadPosts() {
    if (!$auth.repo) {
      console.error('[DEBUG] No repo configured');
      return;
    }

    posts.setLoading(true);

    const postsPath = $auth.postsPath || 'source/_posts';
    const branch = 'main';
    console.log('[DEBUG] Loading posts with params:', {
      repo: $auth.repo,
      path: postsPath,
      branch: branch,
      isAuthenticated: $auth.isAuthenticated
    });

    try {
      const response = await postsApi.getList({
        path: postsPath,
        branch: branch,
        owner: $auth.repo.owner,
        repo: $auth.repo.name,
      });

      console.log('[DEBUG] API response:', response);

      if (response.success && response.data) {
        // API 层已自动解包，response.data 直接是文章数组
        const postsData = response.data as any[];
        posts.setPosts(postsData || []);
      } else {
        console.error('[DEBUG] API returned error:', response.error);
        posts.setError(response.error || '加载文章失败');
      }
    } catch (error) {
      console.error('[DEBUG] Exception loading posts:', error);
      posts.setError('加载文章失败');
    } finally {
      posts.setLoading(false);
    }
  }

  function handleEdit(post: any) {
    // 导航到编辑页面
    navigate(`/edit/${encodeURIComponent(post.path)}`);
  }

  async function handleDelete(post: any) {
    if (!$auth.repo) return;

    try {
      const response = await postsApi.delete(
        post.path,
        post.sha,
        'main',
        $auth.repo.owner,
        $auth.repo.name
      );

      if (response.success) {
        posts.removePost(post.path);
      } else {
        alert('删除失败: ' + (response.error || '未知错误'));
      }
    } catch (error) {
      alert('删除失败');
      console.error('Error deleting post:', error);
    }
  }
</script>

<div class="max-w-4xl mx-auto">
  <div class="flex items-center justify-between mb-6">
    <h1 class="text-3xl font-bold text-primary-950">
      {$auth.isAuthenticated ? '文章列表' : 'Hexo 博客管理器'}
    </h1>
    {#if $auth.isAuthenticated}
      <a
        href="/new"
        on:click|preventDefault={() => navigate('/new')}
        class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md transition flex items-center shadow-sm font-medium"
      >
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 4v16m8-8H4"
          />
        </svg>
        新建文章
      </a>
    {/if}
  </div>

  {#if !$auth.isAuthenticated}
    <!-- 未登录首页引导卡片 -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 text-center max-w-xl mx-auto">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-50 text-primary-600 mb-6 shadow-inner">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      </div>

      <h2 class="text-2xl md:text-3xl font-bold text-gray-900 mb-3">移动端 Hexo 写作新体验</h2>
      <p class="text-gray-600 mb-8 leading-relaxed">
        随时随地在手机或电脑端管理 Hexo 博客文章，支持实时预览、图片粘贴秒传及 GitHub 直连同步。
      </p>

      <div class="mb-8">
        <LoginButton />
      </div>

      <!-- 功能特性 -->
      <div class="pt-6 border-t border-gray-100 text-left">
        <h3 class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4 text-center">核心功能</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
          <div class="flex items-center space-x-2">
            <svg class="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>GitHub 文章增删改查</span>
          </div>
          <div class="flex items-center space-x-2">
            <svg class="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Markdown 实时预览</span>
          </div>
          <div class="flex items-center space-x-2">
            <svg class="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>S3 / R2 图床粘贴秒传</span>
          </div>
          <div class="flex items-center space-x-2">
            <svg class="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>本地草稿与自动保存</span>
          </div>
        </div>
      </div>
    </div>
  {:else if !$auth.repo}
    <div class="bg-primary-50 border border-primary-200 rounded-xl p-6 mb-6">
      <div class="flex items-start space-x-3">
        <svg class="w-6 h-6 text-primary-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 class="font-semibold text-primary-900">请先配置 GitHub 仓库</h3>
          <p class="text-primary-800 text-sm mt-1">
            尚未指定存放 Hexo 博客文章的 GitHub 仓库，配置后即可加载文章列表。
          </p>
          <a
            href="/settings"
            on:click|preventDefault={() => navigate('/settings')}
            class="inline-block mt-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            前往设置仓库
          </a>
        </div>
      </div>
    </div>
  {:else}
    <PostList
      posts={$posts.posts}
      loading={$posts.loading}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />

    {#if $posts.error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
        {$posts.error}
      </div>
    {/if}
  {/if}
</div>
