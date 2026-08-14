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
      // 解码 URL 编码的路径
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

      console.log('[DEBUG] loadPost - response:', response);

      if (response.success && response.data) {
        // API 层已自动解包，response.data 直接是文章对象
        const post = response.data as any;

        // 添加日志：检查原始数据
        console.log('[DEBUG] 原始 post 数据:', post);
        console.log('[DEBUG] post.sha:', post.sha);
        console.log('[DEBUG] post.content (前200字符):', post.content?.substring(0, 200));
        console.log('[DEBUG] post.frontMatter:', post.frontMatter);

        const { title, body } = parseFrontMatter(post.content || '');

        // 添加日志：检查解析结果
        console.log('[DEBUG] 解析后的 title:', title);
        console.log('[DEBUG] 解析后的 body (前200字符):', body?.substring(0, 200));

        editor.setCurrentPost(post);

        // 添加日志：检查 setCurrentPost 后的状态
        console.log('[DEBUG] setCurrentPost 后的 $editor.currentPost:', $editor.currentPost);
        console.log('[DEBUG] setCurrentPost 后的 $editor.currentPost?.sha:', $editor.currentPost?.sha);
        console.log('[DEBUG] setCurrentPost 后的 editor.title:', $editor.title);
        console.log('[DEBUG] setCurrentPost 后的 editor.content (前200字符):', $editor.content?.substring(0, 200));

        editor.setTitle(title || '');
        editor.setContent(body);

        // 添加日志：检查最终状态
        console.log('[DEBUG] 最终 editor.title:', $editor.title);
        console.log('[DEBUG] 最终 editor.content (前200字符):', $editor.content?.substring(0, 200));
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
        // API 层已自动解包
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
      console.log('[DEBUG] updatePost called with:', {
        slug,
        currentPost: $editor.currentPost,
        title: $editor.title,
        content: $editor.content,
      });

      // 使用 editor.fullContent，它已经包含了 front-matter（保留原始日期）
      const contentToSend = get(editor.fullContent);

      console.log('[DEBUG] 使用 fullContent:', contentToSend);

      // 检查必要的参数
      if (!contentToSend || !$editor.currentPost.sha) {
        console.error('[DEBUG] Missing required parameters:', {
          contentToSend,
          sha: $editor.currentPost.sha,
        });
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
        // API 层已自动解包
        const updatedPost = response.data as any;
        editor.markAsSaved(updatedPost.sha);
        // 只更新 sha，不覆盖 title 和 content
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
      // 先加载原文章获取最新的 sha，然后应用草稿内容
      await loadPost();
      // 应用草稿内容并标记为已修改
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

  // 键盘快捷键
  async function handleKeydown(event: KeyboardEvent) {
    // Ctrl/Cmd + S 保存
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      await handleSave();
    }
  }

  // 防抖的内容更新
  const debouncedSave = debounce(() => {
    if ($editor.isDirty) {
      editor.saveToLocal();
    }
  }, 30000);

  $: if ($editor.content) {
    debouncedSave();
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
      // 将 Blob 转换为 Base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // 移除 data URL 前缀，只保留 base64 数据
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

<div class="editor-page">
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="loading"></div>
      <span class="ml-3">加载中...</span>
    </div>
  {:else if error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
      {error}
    </div>
  {:else}
    <div class="editor-container">
      <!-- 工具栏 -->
      <div class="toolbar bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div class="flex items-center space-x-4 flex-1">
          <input
            type="text"
            bind:value={$editor.title}
            placeholder="文章标题"
            class="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div class="flex items-center space-x-2">
          {#if $editor.lastSavedAt}
            <span class="text-sm text-gray-500">
              上次保存: {new Date($editor.lastSavedAt).toLocaleTimeString()}
            </span>
          {/if}
          {#if $editor.isDirty}
            <span class="text-sm text-orange-600">未保存</span>
          {/if}
          {#if $editor.isSaving}
            <span class="text-sm text-primary-600">保存中...</span>
          {/if}
          <button
            on:click={handleSave}
            disabled={$editor.isSaving}
            class="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            保存
          </button>
        </div>
      </div>

      <!-- 编辑器 -->
      <div class="editor-content full-width">
        <div class="editor-pane">
          <MarkdownEditor
            content={$editor.content}
            placeholder="开始编写你的文章..."
            onChange={(content) => editor.setContent(content)}
            onImageUpload={$auth.s3Config ? handleImageUpload : undefined}
            onImageDelete={$auth.s3Config ? handleImageDelete : undefined}
          />
        </div>
      </div>
    </div>
  {/if}

  <!-- 草稿恢复提示 -->
  {#if showDraftModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold mb-4">发现未保存的草稿</h3>
        <p class="text-gray-600 mb-6">
          我们发现了一个未保存的草稿，您要恢复它吗？
        </p>
        <div class="flex justify-end space-x-3">
          <button
            on:click={discardDraft}
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition"
          >
            放弃草稿
          </button>
          <button
            on:click={restoreDraft}
            class="px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-md transition"
          >
            恢复草稿
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .editor-page {
    min-height: calc(100vh - 200px);
  }

  .editor-container {
    background-color: #f9fafb;
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .toolbar {
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    position: relative;
  }

  .editor-content {
    display: block;
    height: calc(100vh - 250px);
  }

  .editor-pane {
    height: 100%;
  }
</style>
