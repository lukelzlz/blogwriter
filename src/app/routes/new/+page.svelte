<script lang="ts">
  import { onMount } from 'svelte';
  import { auth } from '$stores/auth';
  import { editor } from '$stores/editor';
  import { postsApi } from '$lib/api';
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
        'main'
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
    // Ctrl/Cmd + S 保存
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      await handleSave();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="editor-page">
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
      </div>
      <div class="flex items-center space-x-2">
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
          创建文章
        </button>
      </div>
    </div>

    <!-- 编辑器 -->
    <div class="editor-content full-width">
      <div class="editor-pane">
        <MarkdownEditor
          content={$editor.content}
          onChange={(content) => editor.setContent(content)}
        />
      </div>
    </div>
  </div>
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
    display: block;
    height: calc(100vh - 250px);
  }

  .editor-pane {
    height: 100%;
    overflow: hidden;
  }
</style>
