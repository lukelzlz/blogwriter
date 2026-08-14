<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { auth } from '$stores/auth';
  import { editor } from '$stores/editor';
  import { postsApi, imageApi } from '$lib/api';
  import { parseFrontMatter } from '$lib/hexo';
  import { debounce } from '$lib/utils';
  import MarkdownEditor from '$components/MarkdownEditor.svelte';

  export let navigate: (path: string) => void = () => {};
  let slug = '';
  let loading = true;
  let error = '';
  let showDraftModal = false;

  // 从 URL 获取文章路径
  $: if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    const match = path.match(/\/edit\/(.+)/);
    if (match) {
      slug = decodeURIComponent(match[1]);
    }
  }

  onMount(async () => {
    if (!$auth.isAuthenticated || !$auth.repo) {
      navigate('/');
      return;
    }

    // 检查是否有本地草稿
    if (editor.hasLocalDraft(slug)) {
      showDraftModal = true;
      return;
    }

    await loadPost();

    // 失去焦点时自动保存
    window.addEventListener('beforeunload', handleBeforeUnload);
  });

  onDestroy(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  });

  async function loadPost() {
    loading = true;
    error = '';

    try {
      const response = await postsApi.get(slug, 'main', $auth.repo?.owner, $auth.repo?.name);

      if (response.success && response.data) {
        const post = response.data as any;
        const { title, body } = parseFrontMatter(post.content || '');

        editor.setCurrentPost(post);
        editor.setTitle(title || '');
        editor.setContent(body);
      } else {
        error = response.error || '加载文章失败';
      }
    } catch (err) {
      error = '加载文章失败';
      console.error('Error loading post:', err);
    } finally {
      loading = false;
    }
  }

  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if ($editor.isDirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  async function handleSave() {
    if (!$editor.isDirty) {
      alert('没有需要保存的更改');
      return;
    }

    if (!$editor.currentPost) {
      await createPost();
    } else {
      await updatePost();
    }
  }

  async function createPost() {
    if (!$editor.title.trim()) {
      alert('请输入文章标题');
      return;
    }

    editor.setSaving(true);

    try {
      const response = await postsApi.create(
        {
          title: $editor.title,
          content: $editor.content,
          path: $auth.postsPath || 'source/_posts',
        },
        'main',
        $auth.repo?.owner,
        $auth.repo?.name
      );

      if (response.success && response.data) {
        const newPost = response.data as any;
        editor.markAsSaved(newPost.sha);
        editor.setCurrentPost(newPost);
        editor.clearLocalDraft('new');
        alert('保存成功！');
        navigate('/');
      } else {
        alert('保存失败: ' + (response.error || '未知错误'));
      }
    } catch (err) {
      alert('保存失败');
      console.error('Error creating post:', err);
    } finally {
      editor.setSaving(false);
    }
  }

  async function updatePost() {
    if (!$editor.currentPost) return;

    if (!$editor.title.trim()) {
      alert('请输入文章标题');
      return;
    }

    editor.setSaving(true);

    try {
      const contentToSend = get(editor.fullContent);

      if (!contentToSend || !$editor.currentPost.sha) {
        alert('保存失败: 缺少必要参数');
        return;
      }

      const response = await postsApi.update(
        slug,
        {
          path: slug,
          content: contentToSend,
          sha: $editor.currentPost.sha,
        },
        'main',
        $auth.repo?.owner,
        $auth.repo?.name
      );

      if (response.success && response.data) {
        const updatedPost = response.data as any;
        editor.markAsSaved(updatedPost.sha);
        editor.setCurrentPost({
          ...$editor.currentPost,
          sha: updatedPost.sha,
        });
        editor.clearLocalDraft(slug);
        alert('保存成功！');
      } else {
        alert('保存失败: ' + (response.error || '未知错误'));
      }
    } catch (err) {
      alert('保存失败');
      console.error('Error updating post:', err);
    } finally {
      editor.setSaving(false);
    }
  }

  async function restoreDraft() {
    const draft = editor.loadFromLocal(slug);
    if (draft) {
      await loadPost();
      editor.setTitle(draft.title, true);
      editor.setContent(draft.content, true);
    }
    showDraftModal = false;
  }

  function discardDraft() {
    editor.clearLocalDraft(slug);
    loadPost();
    showDraftModal = false;
  }

  async function handleKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      await handleSave();
    }
  }

  const debouncedSave = debounce(() => {
    if ($editor.isDirty) {
      editor.saveToLocal();
    }
  }, 30000);

  $: if ($editor.content) {
    debouncedSave();
  }

  async function handleImageUpload(file: Blob, onProgress?: (progress: number) => void): Promise<{ url: string; key: string; sha?: string } | null> {
    const s3Config = $auth.s3Config;
    const provider = $auth.imageStorageProvider || (s3Config ? 's3' : 'github');
    const githubConfig = $auth.githubImageConfig;

    if (provider === 'github' && !$auth.repo) {
      alert('使用 GitHub 图床需要先在设置页面绑定博客仓库');
      return null;
    }

    if (provider === 's3' && !s3Config) {
      alert('请先在设置页面配置 S3 图床');
      return null;
    }

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await imageApi.upload({
        imageData: base64,
        mimeType: file.type || 'image/png',
        provider,
        config: provider === 's3' ? s3Config! : undefined,
        githubConfig: provider === 'github' ? {
          ...githubConfig,
          owner: $auth.repo?.owner || $auth.user?.login,
          repo: $auth.repo?.name,
        } : undefined,
      }, onProgress);

      if (response.success && response.data) {
        return { url: response.data.url, key: response.data.key, sha: response.data.sha };
      } else {
        console.error('Image upload failed:', response.error);
        alert('图片上传失败: ' + (response.error || '未知错误'));
        return null;
      }
    } catch (err) {
      console.error('Image upload error:', err);
      alert('图片上传失败: ' + (err instanceof Error ? err.message : '网络异常'));
      return null;
    }
  }

  async function handleImageDelete(key: string, sha?: string): Promise<boolean> {
    const s3Config = $auth.s3Config;
    const provider = $auth.imageStorageProvider || (s3Config ? 's3' : 'github');

    try {
      const response = await imageApi.delete({
        key,
        provider,
        config: provider === 's3' ? (s3Config || undefined) : undefined,
        githubConfig: provider === 'github' ? {
          owner: $auth.repo?.owner || $auth.user?.login,
          repo: $auth.repo?.name,
        } : undefined,
        sha,
      });
      return response.success;
    } catch (err) {
      console.error('Image delete error:', err);
      return false;
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="max-w-4xl mx-auto flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
  {#if loading}
    <div class="flex-1 flex flex-col items-center justify-center text-zinc-400">
      <div class="loading !w-6 !h-6 !border-zinc-300 !border-t-zinc-900 mb-3"></div>
      <span class="text-xs font-medium text-zinc-500">正在载入文章内容...</span>
    </div>
  {:else if error}
    <div class="bg-zinc-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center justify-between">
      <span>{error}</span>
      <button on:click={loadPost} class="text-xs underline font-medium">重试</button>
    </div>
  {:else}
    <!-- 顶部操作栏 -->
    <div class="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-zinc-200/80">
      <div class="flex items-center gap-2 min-w-0">
        <button
          on:click={() => navigate('/')}
          class="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition py-1.5 px-2 rounded-md hover:bg-zinc-100 flex-shrink-0"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>返回</span>
        </button>
        <span class="text-zinc-300">/</span>
        <span class="text-xs font-mono text-zinc-600 truncate max-w-[200px] sm:max-w-xs">{slug}</span>
      </div>

      <div class="flex items-center gap-3 flex-shrink-0">
        {#if $editor.lastSavedAt}
          <span class="hidden sm:inline text-[11px] text-zinc-400 font-mono">
            已存 {new Date($editor.lastSavedAt).toLocaleTimeString()}
          </span>
        {/if}
        {#if $editor.isDirty}
          <span class="text-xs text-amber-600 font-medium flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            <span>未保存</span>
          </span>
        {/if}
        {#if $editor.isSaving}
          <span class="text-xs text-zinc-500 font-medium flex items-center gap-1.5">
            <div class="loading !w-3 !h-3 !border-zinc-300 !border-t-zinc-900"></div>
            <span>保存中...</span>
          </span>
        {/if}
        <button
          on:click={handleSave}
          disabled={$editor.isSaving}
          class="bg-zinc-900 hover:bg-black text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>保存修改</span>
        </button>
      </div>
    </div>

    <!-- 沉浸式文稿白底纸质卡片 -->
    <div class="flex-1 flex flex-col bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden p-4 sm:p-8">
      <input
        type="text"
        bind:value={$editor.title}
        placeholder="文章标题..."
        class="w-full text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 placeholder:text-zinc-300 border-0 border-b border-zinc-100 pb-4 mb-4 focus:ring-0 focus:outline-none bg-transparent"
      />

      <div class="flex-1 min-h-[350px]">
        <MarkdownEditor
          content={$editor.content}
          placeholder="开始编写你的文章..."
          onChange={(content) => editor.setContent(content)}
          onImageUpload={($auth.imageStorageProvider === 'github' && $auth.repo) || ($auth.imageStorageProvider === 's3' && $auth.s3Config) ? handleImageUpload : undefined}
          onImageDelete={($auth.imageStorageProvider === 'github' && $auth.repo) || ($auth.imageStorageProvider === 's3' && $auth.s3Config) ? handleImageDelete : undefined}
        />
      </div>
    </div>
  {/if}

  <!-- 草稿恢复弹窗 -->
  {#if showDraftModal}
    <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div class="bg-white rounded-2xl shadow-xl border border-zinc-200 p-6 max-w-sm w-full mx-auto animate-slide-up">
        <div class="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-800 flex items-center justify-center mb-4">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h3 class="text-base font-bold text-zinc-900 mb-1.5">发现未保存的本地草稿</h3>
        <p class="text-xs text-zinc-500 mb-6 leading-relaxed">
          浏览器中暂存了此文章较新的未提交修改，是否恢复？
        </p>

        <div class="flex items-center justify-end gap-2.5">
          <button
            on:click={discardDraft}
            class="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition"
          >
            放弃草稿
          </button>
          <button
            on:click={restoreDraft}
            class="px-4 py-2 text-xs font-semibold bg-zinc-900 text-white hover:bg-black rounded-lg transition shadow-sm active:scale-95"
          >
            恢复草稿
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
