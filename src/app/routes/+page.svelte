<script lang="ts">
  import { onMount } from 'svelte';
  import { auth } from '$stores/auth';
  import { posts } from '$stores/posts';
  import { postsApi } from '$lib/api';
  import PostList from '$components/PostList.svelte';
  import LoginButton from '$components/LoginButton.svelte';

  export let navigate: (path: string) => void = () => {};
  let loading = false;
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

    loading = true;
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
      console.log('[DEBUG] Response success:', response.success);
      console.log('[DEBUG] Response data:', response.data);
      console.log('[DEBUG] Response error:', response.error);

      if (response.success && response.data) {
        // API 层已自动解包，response.data 直接是文章数组
        const postsData = response.data as any[];
        console.log('[DEBUG] Posts loaded successfully, count:', postsData?.length);
        console.log('[DEBUG] Posts details:', postsData);
        posts.setPosts(postsData || []);
      } else {
        console.error('[DEBUG] API returned error:', response.error);
        posts.setError(response.error || '加载文章失败');
      }
    } catch (error) {
      console.error('[DEBUG] Exception loading posts:', error);
      posts.setError('加载文章失败');
    } finally {
      loading = false;
      posts.setLoading(false);
    }
  }

  function handleEdit(post: any) {
    // 导航到编辑页面
    // 对路径进行编码，确保包含特殊字符（如 %）的文件名能正确传递
    navigate(`/edit/${encodeURIComponent(post.path)}`);
  }

  async function handleDelete(post: any) {
    if (!$auth.repo) return;

    try {
      // 不需要编码路径，后端会统一处理编码
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
    <h1 class="text-3xl font-bold text-gray-900">文章列表</h1>
    {#if $auth.isAuthenticated}
      <a
        href="/new"
        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition flex items-center"
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
    <div class="bg-white rounded-lg shadow-sm p-8 text-center">
      <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
      <h2 class="text-xl font-semibold mb-4">请先登录</h2>
      <p class="text-gray-600 mb-6">登录后即可管理您的 Hexo 博客文章</p>
      <LoginButton />
    </div>
  {:else if !$auth.repo}
    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <p class="text-yellow-800">
        请先在设置中配置您的 GitHub 仓库信息
      </p>
      <a href="/settings" class="text-yellow-800 underline mt-2 inline-block">
        前往设置
      </a>
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
