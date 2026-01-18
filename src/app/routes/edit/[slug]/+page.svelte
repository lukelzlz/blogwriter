<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { auth } from '$stores/auth';
  import { editor } from '$stores/editor';
  import { postsApi } from '$lib/api';
  import { parseFrontMatter } from '$lib/hexo';
  import { debounce } from '$lib/utils';
  import MarkdownEditor from '$components/MarkdownEditor.svelte';
  import PreviewPane from '$components/PreviewPane.svelte';

  export let navigate: (path: string) => void = () => {};
  let slug = '';
  let loading = true;
  let error = '';
  let showDraftModal = false;
  let autoSaveInterval: NodeJS.Timeout;

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

    // 设置自动保存（每30秒）
    autoSaveInterval = setInterval(() => {
      if ($editor.isDirty) {
        editor.saveToLocal();
      }
    }, 30000);

    // 失去焦点时自动保存
    window.addEventListener('beforeunload', handleBeforeUnload);
  });

  onDestroy(() => {
    if (autoSaveInterval) {
      clearInterval(autoSaveInterval);
    }
    window.removeEventListener('beforeunload', handleBeforeUnload);
  });

  async function loadPost() {
    loading = true;
    error = '';

    try {
      const response = await postsApi.get(slug, 'main');

      if (response.success && response.data) {
        const post = response.data;
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
    editor.setSaving(true);

    try {
      const response = await postsApi.create(
        {
          title: $editor.title,
          content: $editor.content,
          path: $auth.postsPath || 'source/_posts',
        },
        'main'
      );

      if (response.success && response.data) {
        editor.markAsSaved();
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

    editor.setSaving(true);

    try {
      const response = await postsApi.update(
        slug,
        {
          content: $editor.fullContent,
          sha: $editor.currentPost.sha,
        },
        'main'
      );

      if (response.success && response.data) {
        editor.markAsSaved();
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

  function restoreDraft() {
    const draft = editor.loadFromLocal(slug);
    if (draft) {
      editor.setTitle(draft.title);
      editor.setContent(draft.content);
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
      <div class="toolbar bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-16 z-10">
        <div class="flex items-center space-x-4 flex-1">
          <input
            type="text"
            bind:value={$editor.title}
            placeholder="文章标题"
            class="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            on:click={() => editor.togglePreview()}
            class="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition"
          >
            {$editor.showPreview ? '隐藏预览' : '显示预览'}
          </button>
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
            <span class="text-sm text-blue-600">保存中...</span>
          {/if}
          <button
            on:click={handleSave}
            disabled={$editor.isSaving}
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            保存
          </button>
        </div>
      </div>

      <!-- 编辑器和预览 -->
      <div class="editor-content {!$editor.showPreview ? 'full-width' : 'split-view'}">
        <div class="editor-pane">
          <MarkdownEditor
            bind:content={$editor.content}
            placeholder="开始编写你的文章..."
            onChange={(content) => editor.setContent(content)}
          />
        </div>
        {#if $editor.showPreview}
          <div class="preview-pane">
            <PreviewPane content={$editor.fullContent} />
          </div>
        {/if}
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
            class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition"
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
  }

  .editor-content {
    display: flex;
    height: calc(100vh - 250px);
  }

  .editor-content.full-width {
    display: block;
  }

  .editor-pane {
    flex: 1;
    overflow: hidden;
  }

  .preview-pane {
    flex: 1;
    overflow: hidden;
    border-left: 1px solid #e5e7eb;
  }

  @media (max-width: 768px) {
    .editor-content.split-view {
      flex-direction: column;
    }

    .preview-pane {
      border-left: none;
      border-top: 1px solid #e5e7eb;
    }

    .toolbar {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }
  }
</style>
