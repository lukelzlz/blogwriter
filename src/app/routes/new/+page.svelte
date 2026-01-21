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
    // Ctrl/Cmd + S 保存
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      await handleSave();
    }
  }

  // 图片上传处理
  async function handleImageUpload(file: Blob, onProgress?: (progress: number) => void): Promise<{ url: string; key: string } | null> {
    const s3Config = $auth.s3Config;
    if (!s3Config) {
      alert('请先在设置页面配置图床');
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
        config: s3Config,
      }, onProgress);

      if (response.success && response.data) {
        return { url: response.data.url, key: response.data.key };
      } else {
        console.error('Image upload failed:', response.error);
        alert('图片上传失败: ' + (response.error || '未知错误'));
        return null;
      }
    } catch (err) {
      console.error('Image upload error:', err);
      alert('图片上传失败');
      return null;
    }
  }

  // 图片删除处理
  async function handleImageDelete(key: string): Promise<boolean> {
    const s3Config = $auth.s3Config;
    if (!s3Config) return false;

    try {
      const response = await imageApi.delete(key, s3Config);
      return response.success;
    } catch (err) {
      console.error('Image delete error:', err);
      return false;
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="editor-page">
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
          onImageUpload={$auth.s3Config ? handleImageUpload : undefined}
          onImageDelete={$auth.s3Config ? handleImageDelete : undefined}
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
