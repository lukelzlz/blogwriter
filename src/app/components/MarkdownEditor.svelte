<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import ace from 'ace-builds';
  import 'ace-builds/src-noconflict/mode-markdown';
  import 'ace-builds/src-noconflict/theme-github';

  // 上传结果类型
  interface UploadResult {
    url: string;
    key: string;
    sha?: string;
  }

  export let content = '';
  export let placeholder = '开始编写你的文章...';
  export let readonly = false;
  export let onChange: ((content: string) => void) | undefined = undefined;
  export let onImageUpload: ((file: Blob, onProgress?: (progress: number) => void) => Promise<UploadResult | null>) | undefined = undefined;
  export let onImageDelete: ((key: string, sha?: string) => Promise<boolean>) | undefined = undefined;

  let editorContainer: HTMLDivElement;
  let wrapperContainer: HTMLDivElement;
  let editor: any;
  let isInternalUpdate = false;
  let lastExternalContent = '';
  let lastReadonly = false;
  let isDragging = false;
  let isUploading = false;
  let uploadProgress = 0;
  
  // 撤回相关状态
  let showUndoToast = false;
  let undoCountdown = 30;
  let undoTimer: ReturnType<typeof setInterval> | null = null;
  let lastUploadedImage: { url: string; key: string; markdownText: string; sha?: string } | null = null;
  
  // 移动端快捷键栏相关状态
  let isMobile = false;
  let isIOS = false;
  let showShortcutBar = false;
  let keyboardHeight = 0;
  let viewportOffsetTop = 0;
  
  // iOS 粘贴辅助元素
  let pasteHelperInput: HTMLInputElement;
  let fileInput: HTMLInputElement;
  
  // 触摸滑动检测
  let touchStartX = 0;
  let touchStartY = 0;
  let isTouchMoving = false;
  const TOUCH_THRESHOLD = 10; // 移动超过10px认为是滑动

  onMount(() => {
    // 检测移动端和 iOS
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || ('ontouchstart' in window);
    isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPad with iPadOS
    
    // 初始化 Ace Editor
    editor = ace.edit(editorContainer);

    // 设置主题与模式
    editor.setTheme('ace/theme/github');
    editor.session.setMode('ace/mode/markdown');
    editor.setFontSize(15);
    editor.session.setUseWrapMode(true);
    editor.setShowPrintMargin(false);

    if (placeholder) {
      editor.setOption('placeholder', placeholder);
    }

    lastExternalContent = content;
    editor.setValue(content, -1);

    lastReadonly = readonly;
    editor.setReadOnly(readonly);

    // 监听内容变化
    editor.on('change', () => {
      if (!isInternalUpdate && onChange) {
        const newContent = editor.getValue();
        lastExternalContent = newContent;
        onChange(newContent);
      }
    });

    // 监听粘贴事件
    editor.container.addEventListener('paste', handlePaste, true);
    if (editor.textInput && editor.textInput.getElement()) {
      editor.textInput.getElement().addEventListener('paste', handlePaste, true);
    }
    
    // 监听移动端 Paste 按钮点击
    editor.container.addEventListener('click', handleMobilePasteClick);
    
    // 移动端：监听编辑器获得焦点时显示快捷键栏
    if (isMobile) {
      editor.on('focus', handleEditorFocus);
      editor.on('blur', handleEditorBlur);
      
      // 监听 visualViewport 变化来检测键盘弹出
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleViewportResize);
        window.visualViewport.addEventListener('scroll', handleViewportScroll);
      }
    }

    return () => {
      if (editor) {
        editor.container.removeEventListener('paste', handlePaste, true);
        if (editor.textInput && editor.textInput.getElement()) {
          editor.textInput.getElement().removeEventListener('paste', handlePaste, true);
        }
        editor.container.removeEventListener('click', handleMobilePasteClick);
        editor.destroy();
      }
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportResize);
        window.visualViewport.removeEventListener('scroll', handleViewportScroll);
      }
    };
  });

  // 处理编辑器获得焦点
  function handleEditorFocus() {
    if (isMobile) {
      showShortcutBar = true;
    }
  }
  
  // 处理编辑器失去焦点
  function handleEditorBlur() {
    setTimeout(() => {
      if (!editor?.isFocused()) {
        showShortcutBar = false;
      }
    }, 200);
  }
  
  // 处理视口大小变化（检测键盘弹出）
  function handleViewportResize() {
    if (window.visualViewport) {
      const viewportHeight = window.visualViewport.height;
      const windowHeight = window.innerHeight;
      keyboardHeight = windowHeight - viewportHeight;
      viewportOffsetTop = window.visualViewport.offsetTop;
      
      if (keyboardHeight > 100 && editor?.isFocused()) {
        showShortcutBar = true;
      } else if (keyboardHeight < 100) {
        showShortcutBar = false;
      }
    }
  }
  
  // 处理视口滚动
  function handleViewportScroll() {
    if (window.visualViewport) {
      viewportOffsetTop = window.visualViewport.offsetTop;
    }
  }
  
  // 触摸开始 - 记录起始位置
  function handleTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isTouchMoving = false;
  }
  
  // 触摸移动 - 检测是否是滑动
  function handleTouchMove(event: TouchEvent) {
    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartX);
    const deltaY = Math.abs(touch.clientY - touchStartY);
    
    if (deltaX > TOUCH_THRESHOLD || deltaY > TOUCH_THRESHOLD) {
      isTouchMoving = true;
    }
  }
  
  // 触摸结束 - 只有非滑动才触发操作
  function handleTouchEnd(callback: () => void) {
    return (event: TouchEvent) => {
      if (!isTouchMoving) {
        event.preventDefault();
        callback();
      }
      isTouchMoving = false;
    };
  }
  
  // 快捷键栏：插入文本
  function insertShortcut(text: string, cursorOffset: number = 0) {
    if (!editor) return;
    editor.focus();
    
    const selectedText = editor.getSelectedText();
    
    const pairMap: Record<string, [string, string]> = {
      '****': ['**', '**'],
      '**': ['*', '*'],
      '``': ['`', '`'],
      '~~~~': ['~~', '~~'],
      '[]()': ['[', ']()'],
      '![]()': ['![', ']()'],
    };
    
    if (selectedText) {
      let wrappedText = text;
      let newCursorOffset = 0;
      
      if (pairMap[text]) {
        const [prefix, suffix] = pairMap[text];
        wrappedText = `${prefix}${selectedText}${suffix}`;
        if (text === '[]()' || text === '![]()') {
          newCursorOffset = -1;
        }
      } else {
        wrappedText = text;
      }
      editor.insert(wrappedText);
      
      if (newCursorOffset !== 0) {
        const pos = editor.getCursorPosition();
        editor.moveCursorTo(pos.row, pos.column + newCursorOffset);
      }
    } else {
      editor.insert(text);
      
      if (cursorOffset !== 0) {
        const pos = editor.getCursorPosition();
        editor.moveCursorTo(pos.row, pos.column + cursorOffset);
      }
    }
    
    if (onChange) {
      const newContent = editor.getValue();
      lastExternalContent = newContent;
      onChange(newContent);
    }
  }
  
  // 快捷键栏：粘贴
  async function handleShortcutPaste() {
    if (!editor) return;
    
    if (isIOS) {
      handleIOSPaste();
      return;
    }
    
    editor.focus();
    
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType && onImageUpload) {
          const blob = await item.getType(imageType);
          uploadAndInsert(blob);
          return;
        }
      }
      const text = await navigator.clipboard.readText();
      if (text) {
        editor.insert(text);
        if (onChange) {
          const newContent = editor.getValue();
          lastExternalContent = newContent;
          onChange(newContent);
        }
      }
    } catch (error) {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          editor.insert(text);
          if (onChange) {
            const newContent = editor.getValue();
            lastExternalContent = newContent;
            onChange(newContent);
          }
        }
      } catch (textError) {
        console.log('[MarkdownEditor] Clipboard readText failed:', textError);
      }
    }
  }
  
  // iOS 专用粘贴处理
  function handleIOSPaste() {
    if (!pasteHelperInput) return;
    pasteHelperInput.value = '';
    pasteHelperInput.focus();
    document.execCommand('paste');
    
    setTimeout(() => {
      const text = pasteHelperInput.value;
      if (text && editor) {
        editor.focus();
        editor.insert(text);
        if (onChange) {
          const newContent = editor.getValue();
          lastExternalContent = newContent;
          onChange(newContent);
        }
      } else {
        editor?.focus();
      }
      pasteHelperInput.value = '';
    }, 100);
  }
  
  function handlePasteHelperPaste(event: ClipboardEvent) {
    const items = event.clipboardData?.items;
    if (!items) return;
    
    for (const item of items) {
      if (item.type.startsWith('image/') && onImageUpload) {
        event.preventDefault();
        event.stopPropagation();
        const blob = item.getAsFile();
        if (blob) {
          editor?.focus();
          uploadAndInsert(blob);
        }
        return;
      }
    }
  }
  
  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || !onImageUpload) return;
    
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        uploadAndInsert(file);
        break;
      }
    }
    input.value = '';
  }
  
  function openImagePicker() {
    if (fileInput) {
      fileInput.click();
    }
  }

  function handlePaste(event: ClipboardEvent) {
    if (!onImageUpload) return;
    
    const items = event.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type && item.type.startsWith('image/')) {
          event.preventDefault();
          event.stopPropagation();
          const blob = item.getAsFile();
          if (blob) {
            uploadAndInsert(blob);
          }
          return;
        }
      }
    }

    const files = event.clipboardData?.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type && file.type.startsWith('image/')) {
          event.preventDefault();
          event.stopPropagation();
          uploadAndInsert(file);
          return;
        }
      }
    }
  }

  function handleMobilePasteClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.classList.contains('ace_mobile-button') || target.getAttribute('action') !== 'paste') {
      return;
    }
    
    if (!onImageUpload) return;
    event.preventDefault();
    event.stopPropagation();
    handleMobilePasteAsync();
  }
  
  async function handleMobilePasteAsync() {
    if (!onImageUpload || !editor) return;
    
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          uploadAndInsert(blob);
          return;
        }
      }
      const text = await navigator.clipboard.readText();
      if (text) {
        editor.insert(text);
      }
    } catch (error) {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          editor.insert(text);
        }
      } catch (textError) {
        console.log('[MarkdownEditor] Clipboard readText failed:', textError);
      }
    }
  }

  function handleDragEnter(event: DragEvent) {
    event.preventDefault();
    if (hasImageFile(event) && onImageUpload) {
      isDragging = true;
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (hasImageFile(event) && onImageUpload) {
      event.dataTransfer!.dropEffect = 'copy';
    }
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    const rect = wrapperContainer.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      isDragging = false;
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
    
    if (!onImageUpload) return;
    
    const files = event.dataTransfer?.files;
    if (files) {
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          uploadAndInsert(file);
          break;
        }
      }
    }
  }

  function hasImageFile(event: DragEvent): boolean {
    const types = event.dataTransfer?.types;
    if (types?.includes('Files')) {
      return true;
    }
    return false;
  }

  function insertTextAtCursor(text: string) {
    if (!editor) return;
    isInternalUpdate = true;
    editor.insert(text);
    tick().then(() => {
      isInternalUpdate = false;
      if (onChange) {
        const newContent = editor.getValue();
        lastExternalContent = newContent;
        onChange(newContent);
      }
    });
  }

  async function uploadAndInsert(blob: Blob) {
    if (!onImageUpload || !editor) return;
    
    clearUndoTimer();
    
    isUploading = true;
    uploadProgress = 0;
    
    const placeholderId = Date.now();
    const placeholderText = `![上传中...](uploading-${placeholderId})`;
    insertTextAtCursor(placeholderText);
    
    try {
      const result = await onImageUpload(blob, (progress) => {
        uploadProgress = progress;
      });
      
      if (result) {
        const markdownText = `![](${result.url})`;
        const currentContent = editor.getValue();
        const newContent = currentContent.replace(placeholderText, markdownText);
        isInternalUpdate = true;
        const cursorPos = editor.getCursorPosition();
        editor.setValue(newContent, -1);
        editor.moveCursorToPosition(cursorPos);
        lastExternalContent = newContent;
        tick().then(() => {
          isInternalUpdate = false;
          if (onChange) {
            onChange(newContent);
          }
        });
        
        startUndoTimer(result.url, result.key, markdownText, result.sha);
      } else {
        const currentContent = editor.getValue();
        const newContent = currentContent.replace(placeholderText, '');
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
      const currentContent = editor.getValue();
      const newContent = currentContent.replace(placeholderText, '');
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
      uploadProgress = 0;
    }
  }

  function startUndoTimer(url: string, key: string, markdownText: string, sha?: string) {
    lastUploadedImage = { url, key, markdownText, sha };
    undoCountdown = 30;
    showUndoToast = true;
    
    undoTimer = setInterval(() => {
      undoCountdown--;
      if (undoCountdown <= 0) {
        clearUndoTimer();
      }
    }, 1000);
  }

  function clearUndoTimer() {
    if (undoTimer) {
      clearInterval(undoTimer);
      undoTimer = null;
    }
    showUndoToast = false;
    lastUploadedImage = null;
  }

  async function handleUndo() {
    if (!lastUploadedImage || !onImageDelete || !editor) return;
    
    const { key, markdownText, sha } = lastUploadedImage;
    
    const currentContent = editor.getValue();
    const newContent = currentContent.replace(markdownText, '');
    isInternalUpdate = true;
    editor.setValue(newContent, -1);
    lastExternalContent = newContent;
    tick().then(() => {
      isInternalUpdate = false;
      if (onChange) {
        onChange(newContent);
      }
    });
    
    try {
      await onImageDelete(key, sha);
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
    
    clearUndoTimer();
  }

  $: if (editor && content !== lastExternalContent) {
    tick().then(() => {
      const currentEditorContent = editor.getValue();
      if (content !== currentEditorContent) {
        isInternalUpdate = true;
        lastExternalContent = content;
        editor.setValue(content, -1);
        tick().then(() => {
          isInternalUpdate = false;
        });
      } else {
        lastExternalContent = content;
      }
    });
  }

  $: if (editor && readonly !== lastReadonly) {
    lastReadonly = readonly;
    editor.setReadOnly(readonly);
  }

  onDestroy(() => {
    clearUndoTimer();
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
        <svg class="w-8 h-8 text-zinc-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <circle cx="8.5" cy="8.5" r="1.5"></circle>
          <polyline points="21 15 16 10 5 21"></polyline>
        </svg>
        <span class="text-sm font-semibold text-zinc-900">释放鼠标以上传图片</span>
      </div>
    </div>
  {/if}
  
  {#if isUploading}
    <div class="upload-indicator">
      <div class="upload-progress-container">
        <div class="upload-progress-bar" style="width: {uploadProgress}%"></div>
      </div>
      <span class="text-xs font-mono font-medium">{uploadProgress}%</span>
    </div>
  {/if}
  
  {#if showUndoToast && onImageDelete}
    <div class="undo-toast">
      <div class="undo-toast-content">
        <svg class="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span class="text-xs font-medium">图片已上传</span>
        <span class="undo-countdown">{undoCountdown}s</span>
      </div>
      <button class="undo-btn" on:click={handleUndo}>
        撤回
      </button>
      <button class="undo-close" on:click={clearUndoTimer} aria-label="关闭">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  {/if}
</div>

<!-- iOS 粘贴辅助元素 -->
{#if isIOS}
  <input
    bind:this={pasteHelperInput}
    type="text"
    class="paste-helper-input"
    on:paste={handlePasteHelperPaste}
    aria-hidden="true"
    tabindex="-1"
  />
{/if}

<!-- 隐藏的文件选择器 -->
<input
  bind:this={fileInput}
  type="file"
  accept="image/*"
  class="file-input-hidden"
  on:change={handleFileSelect}
  aria-hidden="true"
  tabindex="-1"
/>

<!-- 移动端快捷键栏 (严格保留悬浮计算逻辑，去除圆角) -->
{#if isMobile && showShortcutBar}
  <div class="shortcut-bar" style="bottom: {keyboardHeight - viewportOffsetTop}px;">
    <div class="shortcut-bar-inner">
      <!-- 粘贴按钮 -->
      <button
        class="shortcut-btn shortcut-btn-paste"
        on:click={handleShortcutPaste}
        on:mousedown|preventDefault
        on:touchstart={handleTouchStart}
        on:touchmove={handleTouchMove}
        on:touchend={handleTouchEnd(handleShortcutPaste)}
        aria-label="粘贴"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
        </svg>
      </button>
      
      <!-- iOS 图片选择按钮 -->
      {#if isIOS && onImageUpload}
        <button
          class="shortcut-btn shortcut-btn-image"
          on:click={openImagePicker}
          on:mousedown|preventDefault
          on:touchstart={handleTouchStart}
          on:touchmove={handleTouchMove}
          on:touchend={handleTouchEnd(openImagePicker)}
          aria-label="选择图片"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
        </button>
      {/if}
      
      <div class="shortcut-divider"></div>
      
      <!-- Markdown 快捷键 -->
      <button
        class="shortcut-btn"
        on:mousedown|preventDefault={() => insertShortcut('# ')}
        on:touchstart={handleTouchStart}
        on:touchmove={handleTouchMove}
        on:touchend={handleTouchEnd(() => insertShortcut('# '))}
        aria-label="标题"
      >#</button>
      
      <button
        class="shortcut-btn"
        on:mousedown|preventDefault={() => insertShortcut('****', -2)}
        on:touchstart={handleTouchStart}
        on:touchmove={handleTouchMove}
        on:touchend={handleTouchEnd(() => insertShortcut('****', -2))}
        aria-label="粗体"
      >**</button>
      
      <button
        class="shortcut-btn"
        on:mousedown|preventDefault={() => insertShortcut('**', -1)}
        on:touchstart={handleTouchStart}
        on:touchmove={handleTouchMove}
        on:touchend={handleTouchEnd(() => insertShortcut('**', -1))}
        aria-label="斜体"
      >*</button>
      
      <button
        class="shortcut-btn"
        on:mousedown|preventDefault={() => insertShortcut('``', -1)}
        on:touchstart={handleTouchStart}
        on:touchmove={handleTouchMove}
        on:touchend={handleTouchEnd(() => insertShortcut('``', -1))}
        aria-label="行内代码"
      >`</button>
      
      <button
        class="shortcut-btn"
        on:mousedown|preventDefault={() => insertShortcut('```\n\n```', -4)}
        on:touchstart={handleTouchStart}
        on:touchmove={handleTouchMove}
        on:touchend={handleTouchEnd(() => insertShortcut('```\n\n```', -4))}
        aria-label="代码块"
      >```</button>
      
      <button
        class="shortcut-btn"
        on:mousedown|preventDefault={() => insertShortcut('[]()', -3)}
        on:touchstart={handleTouchStart}
        on:touchmove={handleTouchMove}
        on:touchend={handleTouchEnd(() => insertShortcut('[]()', -3))}
        aria-label="链接"
      >[]()</button>
      
      <button
        class="shortcut-btn"
        on:mousedown|preventDefault={() => insertShortcut('![]()', -3)}
        on:touchstart={handleTouchStart}
        on:touchmove={handleTouchMove}
        on:touchend={handleTouchEnd(() => insertShortcut('![]()', -3))}
        aria-label="图片"
      >![]()</button>
      
      <button
        class="shortcut-btn"
        on:mousedown|preventDefault={() => insertShortcut('- ')}
        on:touchstart={handleTouchStart}
        on:touchmove={handleTouchMove}
        on:touchend={handleTouchEnd(() => insertShortcut('- '))}
        aria-label="列表"
      >-</button>
      
      <button
        class="shortcut-btn"
        on:mousedown|preventDefault={() => insertShortcut('> ')}
        on:touchstart={handleTouchStart}
        on:touchmove={handleTouchMove}
        on:touchend={handleTouchEnd(() => insertShortcut('> '))}
        aria-label="引用"
      >></button>
      
      <button
        class="shortcut-btn"
        on:mousedown|preventDefault={() => insertShortcut('~~~~', -2)}
        on:touchstart={handleTouchStart}
        on:touchmove={handleTouchMove}
        on:touchend={handleTouchEnd(() => insertShortcut('~~~~', -2))}
        aria-label="删除线"
      >~~</button>
      
      <button
        class="shortcut-btn"
        on:mousedown|preventDefault={() => insertShortcut('---\n')}
        on:touchstart={handleTouchStart}
        on:touchmove={handleTouchMove}
        on:touchend={handleTouchEnd(() => insertShortcut('---\n'))}
        aria-label="分割线"
      >---</button>
    </div>
  </div>
{/if}

<style>
  .editor-wrapper {
    width: 100%;
    height: 100%;
    position: relative;
    background: transparent;
  }

  .editor-container {
    width: 100%;
    height: 100%;
    background: transparent;
    overflow: hidden;
  }

  .editor-wrapper.dragging .editor-container {
    outline: 2px dashed #18181b;
  }

  .drag-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.04);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 10;
  }

  .drag-hint {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: #18181b;
    background: #ffffff;
    padding: 1.25rem 2rem;
    border: 1px solid #e4e4e7;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  }

  .upload-indicator {
    position: absolute;
    top: 1rem;
    right: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #18181b;
    color: white;
    padding: 0.4rem 0.8rem;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 500;
    z-index: 10;
    min-width: 110px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .upload-progress-container {
    flex: 1;
    height: 4px;
    background: rgba(255, 255, 255, 0.25);
    border-radius: 2px;
    overflow: hidden;
    min-width: 50px;
  }

  .upload-progress-bar {
    height: 100%;
    background: white;
    border-radius: 2px;
    transition: width 0.15s ease-out;
  }

  /* 撤回提示 */
  .undo-toast {
    position: fixed;
    top: 1.25rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: #09090b;
    color: white;
    padding: 0.6rem 1rem;
    border-radius: 9999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: 0 12px 30px -4px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    animation: slideDown 0.25s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-1rem);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .undo-toast-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
  }

  .undo-countdown {
    color: #a1a1aa;
    font-variant-numeric: tabular-nums;
    font-family: ui-monospace, monospace;
  }

  .undo-btn {
    background: #ffffff;
    color: #09090b;
    border: none;
    padding: 0.25rem 0.65rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .undo-btn:hover {
    opacity: 0.9;
  }

  .undo-close {
    background: transparent;
    border: none;
    color: #71717a;
    padding: 0.2rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    transition: color 0.15s;
  }

  .undo-close:hover {
    color: white;
  }

  /* 移动端快捷键栏 - 绝对保留悬浮计算逻辑，去除圆角(直角设计) */
  :global(.shortcut-bar) {
    position: fixed;
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(8px);
    border-top: 1px solid #e4e4e7;
    z-index: 1000;
    padding: 0;
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.06);
    transition: bottom 0.1s ease-out;
    will-change: bottom;
  }

  :global(.shortcut-bar-inner) {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 6px 10px;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
    mask-image: linear-gradient(to right, transparent, black 8px, black calc(100% - 16px), transparent);
    -webkit-mask-image: linear-gradient(to right, transparent, black 8px, black calc(100% - 16px), transparent);
    scroll-behavior: smooth;
    touch-action: pan-x pan-y;
  }

  :global(.shortcut-bar-inner::-webkit-scrollbar) {
    display: none;
  }

  /* 快捷栏按钮：严格去除圆角 (border-radius: 0px) */
  :global(.shortcut-btn) {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 38px;
    height: 34px;
    padding: 0 8px;
    background: #ffffff;
    border: 1px solid #e4e4e7;
    border-radius: 0px !important; /* 去除圆角，直角设计 */
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 13.5px;
    font-weight: 500;
    color: #18181b;
    cursor: pointer;
    transition: all 0.12s ease;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }

  :global(.shortcut-btn:active) {
    background: #f4f4f5;
  }

  :global(.shortcut-btn-paste) {
    background: #18181b;
    border-color: #18181b;
    color: #ffffff;
    border-radius: 0px !important;
  }

  :global(.shortcut-btn-paste:active) {
    background: #000000;
  }

  :global(.shortcut-btn-image) {
    background: #27272a;
    border-color: #27272a;
    color: #ffffff;
    border-radius: 0px !important;
  }

  :global(.shortcut-btn-image:active) {
    background: #09090b;
  }

  :global(.shortcut-divider) {
    width: 1px;
    height: 22px;
    background: #e4e4e7;
    margin: 0 4px;
    flex-shrink: 0;
  }

  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    :global(.shortcut-bar) {
      padding-bottom: env(safe-area-inset-bottom);
    }
  }

  .paste-helper-input,
  .file-input-hidden {
    position: fixed;
    top: -9999px;
    left: -9999px;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }
</style>
