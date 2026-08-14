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
      await loadPosts();
      hasLoaded = true;
    }
  }

  onMount(async () => {
    await loadPostsIfNeeded();
  });

  // 响应式监听 auth 状态变化
  $: if ($auth.isAuthenticated && $auth.repo) {
    loadPostsIfNeeded();
  }

  async function loadPosts() {
    if (!$auth.repo) return;

    posts.setLoading(true);

    const postsPath = $auth.postsPath || 'source/_posts';
    const branch = 'main';

    try {
      const response = await postsApi.getList({
        path: postsPath,
        branch: branch,
        owner: $auth.repo.owner,
        repo: $auth.repo.name,
      });

      if (response.success && response.data) {
        const postsData = response.data as any[];
        posts.setPosts(postsData || []);
      } else {
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
  <!-- 顶栏标题与操作 -->
  {#if $auth.isAuthenticated}
    <div class="flex flex-row items-center justify-between gap-4 mb-8 pb-4 border-b border-zinc-200/80">
      <div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
          文章列表
        </h1>
        <p class="text-xs text-zinc-600 mt-1 font-mono">
          {$auth.repo ? `${$auth.repo.owner}/${$auth.repo.name}` : '未连接仓库'} · {$posts.posts.length} 篇文章
        </p>
      </div>
      
      <a
        href="/new"
        on:click|preventDefault={() => navigate('/new')}
        class="inline-flex items-center justify-center gap-1.5 bg-zinc-900 hover:bg-black text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow active:scale-95 flex-shrink-0"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        <span>新建文章</span>
      </a>
    </div>
  {/if}

  {#if !$auth.isAuthenticated}
    <!-- 未登录首页引导卡片 -->
    <div class="max-w-2xl mx-auto py-8 sm:py-16 text-center animate-fade-in">
      <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900 text-white mb-6 shadow-sm">
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </div>

      <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 mb-4">
        随时随地，专注写作
      </h1>
      <p class="text-base sm:text-lg text-zinc-600 mb-10 max-w-lg mx-auto leading-relaxed">
        专为 Hexo 打造的现代移动与桌面写作体验，支持 GitHub 直连秒级同步与多云图床。
      </p>

      <div class="mb-14">
        <LoginButton />
      </div>

      <!-- 功能特性微网格 -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-10 border-t border-zinc-200">
        <div class="p-4 rounded-xl bg-white border border-zinc-200/80 shadow-sm">
          <div class="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800 mb-3">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="text-sm font-semibold text-zinc-900 mb-1">GitHub 直连读写</h3>
          <p class="text-xs text-zinc-500 leading-relaxed">基于 OAuth 安全鉴权，文章创建、修改、删除直连仓库无第三方中转。</p>
        </div>

        <div class="p-4 rounded-xl bg-white border border-zinc-200/80 shadow-sm">
          <div class="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800 mb-3">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 class="text-sm font-semibold text-zinc-900 mb-1">多图床秒传</h3>
          <p class="text-xs text-zinc-500 leading-relaxed">支持直接存入博客仓库或 S3 / Cloudflare R2 云存储，粘贴即传并支持撤回。</p>
        </div>

        <div class="p-4 rounded-xl bg-white border border-zinc-200/80 shadow-sm">
          <div class="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800 mb-3">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 class="text-sm font-semibold text-zinc-900 mb-1">移动端沉浸排版</h3>
          <p class="text-xs text-zinc-500 leading-relaxed">针对手机键盘精心调校的底部悬浮快捷栏与大触控区域，随时随地写作。</p>
        </div>

        <div class="p-4 rounded-xl bg-white border border-zinc-200/80 shadow-sm">
          <div class="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800 mb-3">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          </div>
          <h3 class="text-sm font-semibold text-zinc-900 mb-1">本地草稿防护</h3>
          <p class="text-xs text-zinc-500 leading-relaxed">实时自动暂存本地浏览器，意外关闭或刷新也能一键恢复完整文稿。</p>
        </div>
      </div>
    </div>
  {:else if !$auth.repo}
    <div class="bg-zinc-50 border border-zinc-200 rounded-xl p-6 mb-6 animate-fade-in">
      <div class="flex items-start gap-3.5">
        <div class="w-8 h-8 rounded-lg bg-zinc-200 flex items-center justify-center text-zinc-700 flex-shrink-0">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="flex-1">
          <h3 class="font-semibold text-zinc-900 text-sm">请先绑定你的 Hexo 博客仓库</h3>
          <p class="text-zinc-500 text-xs mt-1 leading-relaxed">
            首次使用需配置存放 Hexo 文章的 GitHub 仓库名称，配置后将自动同步文章列表。
          </p>
          <a
            href="/settings"
            on:click|preventDefault={() => navigate('/settings')}
            class="inline-flex items-center gap-1.5 mt-3.5 bg-zinc-900 hover:bg-black text-white text-xs font-medium px-3.5 py-2 rounded-lg transition shadow-sm"
          >
            <span>前往配置仓库</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
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
      <div class="bg-zinc-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mt-6 flex items-center gap-2">
        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke-width="2"/>
          <line x1="12" y1="8" x2="12" y2="12" stroke-width="2"/>
          <line x1="12" y1="16" x2="12.01" y2="16" stroke-width="2"/>
        </svg>
        <span>{$posts.error}</span>
      </div>
    {/if}
  {/if}
</div>
