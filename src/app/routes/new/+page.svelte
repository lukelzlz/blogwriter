<script lang="ts">
  import { onMount } from 'svelte';
  import { auth } from '$stores/auth';
  import { editor } from '$stores/editor';
  import { postsApi, imageApi } from '$lib/api';
  import MarkdownEditor from '$components/MarkdownEditor.svelte';

  export let navigate: (path: string) => void = () => {};

  onMount(() => {
    if (!$auth.isAuthenticated || !$auth.repo) {
      window.location.href = '/';
      return;
    }

    // 重置编辑器状态
    editor.reset();

    // 检查是否有新文章的本地草稿
    if (editor.hasLocalDraft('new')) {
      const draft = editor.loadFromLocal('new');
      if (draft) {
        editor.setTitle(draft.title);
        editor.setContent(draft.content);
      }
    }
  });

  async function handleSave() {
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
        editor.markAsSaved();
        editor.clearLocalDraft('new');
        alert('创建成功！');
        navigate('/');
      } else {
        alert('创建失败: ' + (response.error || '未知错误'));
      }
    } catch (err) {
      alert('创建失败');
      console.error('Error creating post:', err);
    } finally {
      editor.setSaving(false);
    }
  }

  // 键盘快捷键
  async function handleKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      await handleSave();
    }
  }

  // 图片上传处理
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

  // 图片删除处理
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
  <!-- 顶部轻量工具操作栏 -->
  <div class="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-zinc-200/80">
    <div class="flex items-center gap-2">
      <button
        on:click={() => navigate('/')}
        class="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition py-1.5 px-2 rounded-md hover:bg-zinc-100"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>返回</span>
      </button>
      <span class="text-zinc-300">/</span>
      <span class="text-xs font-medium text-zinc-800">新建文章</span>
    </div>

    <div class="flex items-center gap-3">
      {#if $editor.isDirty}
        <span class="text-xs text-amber-600 font-medium flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          <span>未保存草稿</span>
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
        <span>发布文章</span>
      </button>
    </div>
  </div>

  <!-- 沉浸式文稿白底纸质卡片 -->
  <div class="flex-1 flex flex-col bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden p-4 sm:p-8">
    <!-- 无边框大标题输入框 -->
    <input
      type="text"
      bind:value={$editor.title}
      placeholder="输入文章标题..."
      class="w-full text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 placeholder:text-zinc-300 border-0 border-b border-zinc-100 pb-4 mb-4 focus:ring-0 focus:outline-none bg-transparent"
    />

    <!-- 编辑器区域 -->
    <div class="flex-1 min-h-[350px]">
      <MarkdownEditor
        content={$editor.content}
        placeholder="在这里开始书写 Markdown 正文，支持直接粘贴图片或拖拽图片上传..."
        onChange={(content) => editor.setContent(content)}
        onImageUpload={($auth.imageStorageProvider === 'github' && $auth.repo) || ($auth.imageStorageProvider === 's3' && $auth.s3Config) ? handleImageUpload : undefined}
        onImageDelete={($auth.imageStorageProvider === 'github' && $auth.repo) || ($auth.imageStorageProvider === 's3' && $auth.s3Config) ? handleImageDelete : undefined}
      />
    </div>
  </div>
</div>
