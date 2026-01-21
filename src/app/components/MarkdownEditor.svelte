<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import ace from 'ace-builds';
  import 'ace-builds/src-noconflict/mode-markdown';
  import 'ace-builds/src-noconflict/theme-github';

  export let content = '';
  export let placeholder = '开始编写你的文章...';
  export let readonly = false;
  export let onChange: ((content: string) => void) | undefined = undefined;
  export let onImageUpload: ((file: Blob) => Promise<string | null>) | undefined = undefined;

  let editorContainer: HTMLDivElement;
  let wrapperContainer: HTMLDivElement;
  let editor: any;
  let isInternalUpdate = false;
  let lastExternalContent = '';
  let lastReadonly = false;
  let isDragging = false;
  let isUploading = false;

  onMount(() => {
    console.log('[MarkdownEditor] onMount called');
    console.log('[MarkdownEditor] editorContainer:', editorContainer);
    console.log('[MarkdownEditor] content:', content);
    console.log('[MarkdownEditor] readonly:', readonly);

    // 初始化 Ace Editor
    editor = ace.edit(editorContainer);
    console.log('[MarkdownEditor] Ace Editor created:', editor);

    // 设置主题
    editor.setTheme('ace/theme/github');

    // 设置语言模式
    editor.session.setMode('ace/mode/markdown');

    // 设置字体大小
    editor.setFontSize(14);

    // 设置自动换行
    editor.session.setUseWrapMode(true);

    // 隐藏打印边距
    editor.setShowPrintMargin(false);

    // 设置初始内容
    lastExternalContent = content;
    editor.setValue(content, -1);
    console.log('[MarkdownEditor] Initial content set:', content);

    // 设置初始只读模式
    lastReadonly = readonly;
    editor.setReadOnly(readonly);
    console.log('[MarkdownEditor] Initial readonly set:', readonly);

    // 监听内容变化
    editor.on('change', () => {
      console.log('[MarkdownEditor] Change event fired, isInternalUpdate:', isInternalUpdate);
      if (!isInternalUpdate && onChange) {
        const newContent = editor.getValue();
        console.log('[MarkdownEditor] Calling onChange with:', newContent);
        // 立即更新 lastExternalContent，避免外部更新触发重新设置
        lastExternalContent = newContent;
        onChange(newContent);
      }
    });

    // 监听粘贴事件
    editor.container.addEventListener('paste', handlePaste);
    
    // 监听移动端 Paste 按钮点击（Ace Editor 移动端会显示 Paste 按钮）
    editor.container.addEventListener('click', handleMobilePasteClick);

    console.log('[MarkdownEditor] Setup complete');

    return () => {
      if (editor) {
        editor.container.removeEventListener('paste', handlePaste);
        editor.container.removeEventListener('click', handleMobilePasteClick);
        editor.destroy();
      }
    };
  });

  // 粘贴事件处理
  function handlePaste(event: ClipboardEvent) {
    const items = event.clipboardData?.items;
    if (!items || !onImageUpload) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        event.preventDefault();
        event.stopPropagation();
        const blob = item.getAsFile();
        if (blob) {
          uploadAndInsert(blob);
        }
        break;
      }
    }
  }

  // 移动端 Paste 按钮点击处理
  function handleMobilePasteClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    // 检查是否点击了 Ace Editor 的移动端 Paste 按钮
    if (!target.classList.contains('ace_mobile-button') || target.getAttribute('action') !== 'paste') {
      return;
    }
    
    if (!onImageUpload) return;
    
    // 立即阻止默认行为，防止 Ace Editor 执行粘贴命令
    event.preventDefault();
    event.stopPropagation();
    
    // 异步处理剪贴板
    handleMobilePasteAsync();
  }
  
  // 异步处理移动端粘贴
  async function handleMobilePasteAsync() {
    if (!onImageUpload || !editor) return;
    
    // 使用 Clipboard API 读取剪贴板
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        // 查找图片类型
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          uploadAndInsert(blob);
          return;
        }
      }
      // 没有图片，尝试读取文本并插入
      const text = await navigator.clipboard.readText();
      if (text) {
        editor.insert(text);
      }
    } catch (error) {
      // Clipboard API 可能因权限问题失败，尝试读取文本
      console.log('[MarkdownEditor] Clipboard read failed, trying readText:', error);
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          editor.insert(text);
        }
      } catch (textError) {
        console.log('[MarkdownEditor] Clipboard readText also failed:', textError);
      }
    }
  }

  // 拖拽进入
  function handleDragEnter(event: DragEvent) {
    event.preventDefault();
    if (hasImageFile(event) && onImageUpload) {
      isDragging = true;
    }
  }

  // 拖拽悬停
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (hasImageFile(event) && onImageUpload) {
      event.dataTransfer!.dropEffect = 'copy';
    }
  }

  // 拖拽离开
  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    // 检查是否真的离开了容器
    const rect = wrapperContainer.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      isDragging = false;
    }
  }

  // 放下文件
  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
    
    if (!onImageUpload) return;
    
    const files = event.dataTransfer?.files;
    if (files) {
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          uploadAndInsert(file);
          break; // 只处理第一个图片
        }
      }
    }
  }

  // 检查是否有图片文件
  function hasImageFile(event: DragEvent): boolean {
    const types = event.dataTransfer?.types;
    if (types?.includes('Files')) {
      // 在 dragenter/dragover 时无法直接访问文件类型
      // 所以只检查是否有文件
      return true;
    }
    return false;
  }

  // 在光标位置插入文本
  function insertTextAtCursor(text: string) {
    if (!editor) return;
    isInternalUpdate = true;
    editor.insert(text);
    tick().then(() => {
      isInternalUpdate = false;
      // 触发 onChange
      if (onChange) {
        const newContent = editor.getValue();
        lastExternalContent = newContent;
        onChange(newContent);
      }
    });
  }

  // 上传并插入
  async function uploadAndInsert(blob: Blob) {
    if (!onImageUpload || !editor) return;
    
    isUploading = true;
    
    // 1. 在光标位置插入占位符
    const placeholderId = Date.now();
    const placeholder = `![上传中...](uploading-${placeholderId})`;
    insertTextAtCursor(placeholder);
    
    try {
      // 2. 上传图片
      const url = await onImageUpload(blob);
      
      // 3. 替换占位符
      if (url) {
        const currentContent = editor.getValue();
        const newContent = currentContent.replace(placeholder, `![](${url})`);
        isInternalUpdate = true;
        const cursorPos = editor.getCursorPosition();
        editor.setValue(newContent, -1);
        // 尝试恢复光标位置
        editor.moveCursorToPosition(cursorPos);
        lastExternalContent = newContent;
        tick().then(() => {
          isInternalUpdate = false;
          if (onChange) {
            onChange(newContent);
          }
        });
      } else {
        // 上传失败，移除占位符
        const currentContent = editor.getValue();
        const newContent = currentContent.replace(placeholder, '');
        isInternalUpdate = true;
        editor.setValue(newContent, -1);
        lastExternalContent = newContent;
        tick().then(() => {
          isInternalUpdate = false;
          if (onChange) {
            onChange(newContent);
          }
        });
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      // 上传失败，移除占位符
      const currentContent = editor.getValue();
      const newContent = currentContent.replace(placeholder, '');
      isInternalUpdate = true;
      editor.setValue(newContent, -1);
      lastExternalContent = newContent;
      tick().then(() => {
        isInternalUpdate = false;
        if (onChange) {
          onChange(newContent);
        }
      });
    } finally {
      isUploading = false;
    }
  }

  // 外部内容更新时同步到编辑器
  $: if (editor && content !== lastExternalContent) {
    console.log('[MarkdownEditor] External content update detected:', content);
    // 使用 tick 确保 Svelte 的响应式系统完成更新
    tick().then(() => {
      const currentEditorContent = editor.getValue();
      console.log('[MarkdownEditor] Current editor content:', currentEditorContent);
      console.log('[MarkdownEditor] External content:', content);
      // 只有当外部内容与编辑器当前内容不同时才更新
      if (content !== currentEditorContent) {
        console.log('[MarkdownEditor] Updating editor content');
        isInternalUpdate = true;
        lastExternalContent = content;
        editor.setValue(content, -1);
        tick().then(() => {
          isInternalUpdate = false;
        });
      } else {
        console.log('[MarkdownEditor] Content matches, skipping update');
        lastExternalContent = content;
      }
    });
  }

  // 监听 readonly 变化
  $: if (editor && readonly !== lastReadonly) {
    console.log('[MarkdownEditor] Readonly changed from', lastReadonly, 'to', readonly);
    lastReadonly = readonly;
    editor.setReadOnly(readonly);
  }

  onDestroy(() => {
    if (editor) {
      editor.container.removeEventListener('paste', handlePaste);
      editor.container.removeEventListener('click', handleMobilePasteClick);
      editor.destroy();
    }
  });
</script>

<div
  bind:this={wrapperContainer}
  class="editor-wrapper"
  class:dragging={isDragging}
  role="region"
  aria-label="Markdown 编辑器，支持拖拽上传图片"
  on:dragenter={handleDragEnter}
  on:dragover={handleDragOver}
  on:dragleave={handleDragLeave}
  on:drop={handleDrop}
>
  <div bind:this={editorContainer} class="editor-container"></div>
  
  {#if isDragging}
    <div class="drag-overlay">
      <div class="drag-hint">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <span>释放以上传图片</span>
      </div>
    </div>
  {/if}
  
  {#if isUploading}
    <div class="upload-indicator">
      <div class="upload-spinner"></div>
      <span>上传中...</span>
    </div>
  {/if}
</div>

<style>
  .editor-wrapper {
    width: 100%;
    height: 100%;
    position: relative;
  }

  .editor-container {
    width: 100%;
    height: 100%;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .editor-wrapper.dragging .editor-container {
    border: 2px dashed #3b82f6;
  }

  .drag-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(59, 130, 246, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 10;
    border-radius: 0.5rem;
  }

  .drag-hint {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: #3b82f6;
    font-size: 1.125rem;
    font-weight: 500;
    background: rgba(255, 255, 255, 0.95);
    padding: 1.5rem 2rem;
    border-radius: 0.75rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .upload-indicator {
    position: absolute;
    top: 1rem;
    right: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(59, 130, 246, 0.9);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    z-index: 10;
  }

  .upload-spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  :global(.ace_editor) {
    font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
    font-size: 14px;
    line-height: 1.6;
  }

  :global(.ace_gutter) {
    background: #f9fafb;
    color: #6b7280;
  }

  /* 移动端适配 */
  @media (max-width: 768px) {
    :global(.ace_editor) {
      font-size: 16px;
    }
  }
</style>
