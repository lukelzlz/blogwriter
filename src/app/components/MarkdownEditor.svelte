<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import ace from 'ace-builds';
  import 'ace-builds/src-noconflict/mode-markdown';
  import 'ace-builds/src-noconflict/theme-github';

  // 上传结果类型
  interface UploadResult {
    url: string;
    key: string;
  }

  export let content = '';
  export let placeholder = '开始编写你的文章...';
  export let readonly = false;
  export let onChange: ((content: string) => void) | undefined = undefined;
  export let onImageUpload: ((file: Blob, onProgress?: (progress: number) => void) => Promise<UploadResult | null>) | undefined = undefined;
  export let onImageDelete: ((key: string) => Promise<boolean>) | undefined = undefined;

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
  let lastUploadedImage: { url: string; key: string; markdownText: string } | null = null;
  
  // 移动端快捷键栏相关状态
  let isMobile = false;
  let showShortcutBar = false;
  let keyboardHeight = 0;
  let viewportOffsetTop = 0;
  
  // 触摸滑动检测
  let touchStartX = 0;
  let touchStartY = 0;
  let isTouchMoving = false;
  const TOUCH_THRESHOLD = 10; // 移动超过10px认为是滑动

  onMount(() => {
    console.log('[MarkdownEditor] onMount called');
    console.log('[MarkdownEditor] editorContainer:', editorContainer);
    console.log('[MarkdownEditor] content:', content);
    console.log('[MarkdownEditor] readonly:', readonly);

    // 检测移动端
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || ('ontouchstart' in window);
    
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

    console.log('[MarkdownEditor] Setup complete');

    return () => {
      if (editor) {
        editor.container.removeEventListener('paste', handlePaste);
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
    // 延迟隐藏，避免点击快捷键栏时立即隐藏
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
      
      // 如果键盘高度大于100，认为键盘已弹出
      if (keyboardHeight > 100 && editor?.isFocused()) {
        showShortcutBar = true;
      } else if (keyboardHeight < 100) {
        showShortcutBar = false;
      }
    }
  }
  
  // 处理视口滚动（iOS 上滑动页面时 visualViewport 会滚动）
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
    
    // 保持编辑器焦点
    editor.focus();
    
    const selection = editor.getSelection();
    const selectedText = editor.getSelectedText();
    
    if (selectedText) {
      // 如果有选中文本，根据快捷键类型包裹文本
      let wrappedText = text;
      if (text === '**') {
        wrappedText = `**${selectedText}**`;
      } else if (text === '*') {
        wrappedText = `*${selectedText}*`;
      } else if (text === '`') {
        wrappedText = `\`${selectedText}\``;
      } else if (text === '~~') {
        wrappedText = `~~${selectedText}~~`;
      } else if (text === '[]()') {
        wrappedText = `[${selectedText}]()`;
        cursorOffset = -1; // 光标放在括号内
      } else {
        // 其他情况直接替换
        wrappedText = text;
      }
      editor.insert(wrappedText);
    } else {
      // 没有选中文本，直接插入
      editor.insert(text);
      
      // 移动光标
      if (cursorOffset !== 0) {
        const pos = editor.getCursorPosition();
        editor.moveCursorTo(pos.row, pos.column + cursorOffset);
      }
    }
    
    // 触发 onChange
    if (onChange) {
      const newContent = editor.getValue();
      lastExternalContent = newContent;
      onChange(newContent);
    }
  }
  
  // 快捷键栏：粘贴（处理图片）
  async function handleShortcutPaste() {
    if (!editor) return;
    
    // 保持编辑器焦点
    editor.focus();
    
    try {
      // 使用 Clipboard API 读取剪贴板
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        // 查找图片类型
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType && onImageUpload) {
          const blob = await item.getType(imageType);
          uploadAndInsert(blob);
          return;
        }
      }
      // 没有图片，尝试读取文本并插入
      const text = await navigator.clipboard.readText();
      if (text) {
        editor.insert(text);
        // 触发 onChange
        if (onChange) {
          const newContent = editor.getValue();
          lastExternalContent = newContent;
          onChange(newContent);
        }
      }
    } catch (error) {
      console.log('[MarkdownEditor] Clipboard read failed, trying readText:', error);
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          editor.insert(text);
          // 触发 onChange
          if (onChange) {
            const newContent = editor.getValue();
            lastExternalContent = newContent;
            onChange(newContent);
          }
        }
      } catch (textError) {
        console.log('[MarkdownEditor] Clipboard readText also failed:', textError);
      }
    }
  }

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
    
    // 清除之前的撤回状态
    clearUndoTimer();
    
    isUploading = true;
    uploadProgress = 0;
    
    // 1. 在光标位置插入占位符
    const placeholderId = Date.now();
    const placeholderText = `![上传中...](uploading-${placeholderId})`;
    insertTextAtCursor(placeholderText);
    
    try {
      // 2. 上传图片（带进度回调）
      const result = await onImageUpload(blob, (progress) => {
        uploadProgress = progress;
      });
      
      // 3. 替换占位符
      if (result) {
        const markdownText = `![](${result.url})`;
        const currentContent = editor.getValue();
        const newContent = currentContent.replace(placeholderText, markdownText);
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
        
        // 显示撤回提示
        startUndoTimer(result.url, result.key, markdownText);
      } else {
        // 上传失败，移除占位符
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
      // 上传失败，移除占位符
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

  // 开始撤回倒计时
  function startUndoTimer(url: string, key: string, markdownText: string) {
    lastUploadedImage = { url, key, markdownText };
    undoCountdown = 30;
    showUndoToast = true;
    
    undoTimer = setInterval(() => {
      undoCountdown--;
      if (undoCountdown <= 0) {
        clearUndoTimer();
      }
    }, 1000);
  }

  // 清除撤回计时器
  function clearUndoTimer() {
    if (undoTimer) {
      clearInterval(undoTimer);
      undoTimer = null;
    }
    showUndoToast = false;
    lastUploadedImage = null;
  }

  // 执行撤回
  async function handleUndo() {
    if (!lastUploadedImage || !onImageDelete || !editor) return;
    
    const { key, markdownText } = lastUploadedImage;
    
    // 1. 从编辑器中移除图片 markdown
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
    
    // 2. 删除远程文件
    try {
      await onImageDelete(key);
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
    
    // 3. 清除撤回状态
    clearUndoTimer();
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
      <div class="upload-progress-container">
        <div class="upload-progress-bar" style="width: {uploadProgress}%"></div>
      </div>
      <span>{uploadProgress}%</span>
    </div>
  {/if}
  
  {#if showUndoToast && onImageDelete}
    <div class="undo-toast">
      <div class="undo-toast-content">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
        <span>图片已上传</span>
        <span class="undo-countdown">{undoCountdown}s</span>
      </div>
      <button class="undo-btn" on:click={handleUndo}>
        撤回
      </button>
      <button class="undo-close" on:click={clearUndoTimer} aria-label="关闭">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
  {/if}
</div>

<!-- 移动端快捷键栏 -->
{#if isMobile && showShortcutBar}
  <div class="shortcut-bar" style="bottom: {keyboardHeight}px; transform: translateY({-viewportOffsetTop}px);">
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
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
        </svg>
      </button>
      
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
        on:mousedown|preventDefault={() => insertShortcut('**', -2)}
        on:touchstart={handleTouchStart}
        on:touchmove={handleTouchMove}
        on:touchend={handleTouchEnd(() => insertShortcut('**', -2))}
        aria-label="粗体"
      >**</button>
      
      <button
        class="shortcut-btn"
        on:mousedown|preventDefault={() => insertShortcut('*', -1)}
        on:touchstart={handleTouchStart}
        on:touchmove={handleTouchMove}
        on:touchend={handleTouchEnd(() => insertShortcut('*', -1))}
        aria-label="斜体"
      >*</button>
      
      <button
        class="shortcut-btn"
        on:mousedown|preventDefault={() => insertShortcut('`', -1)}
        on:touchstart={handleTouchStart}
        on:touchmove={handleTouchMove}
        on:touchend={handleTouchEnd(() => insertShortcut('`', -1))}
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
        on:mousedown|preventDefault={() => insertShortcut('~~', -2)}
        on:touchstart={handleTouchStart}
        on:touchmove={handleTouchMove}
        on:touchend={handleTouchEnd(() => insertShortcut('~~', -2))}
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
    background: rgba(59, 130, 246, 0.95);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    z-index: 10;
    min-width: 120px;
  }

  .upload-progress-container {
    flex: 1;
    height: 6px;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
    overflow: hidden;
    min-width: 60px;
  }

  .upload-progress-bar {
    height: 100%;
    background: white;
    border-radius: 3px;
    transition: width 0.15s ease-out;
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

  /* 撤回提示 */
  .undo-toast {
    position: fixed;
    top: 1rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: #1f2937;
    color: white;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    z-index: 1000;
    animation: slideDown 0.3s ease-out;
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
    font-size: 0.875rem;
  }

  .undo-countdown {
    color: #9ca3af;
    font-variant-numeric: tabular-nums;
  }

  .undo-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.375rem 0.75rem;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s;
  }

  .undo-btn:hover {
    background: #2563eb;
  }

  .undo-close {
    background: transparent;
    border: none;
    color: #9ca3af;
    padding: 0.25rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
    transition: color 0.15s, background 0.15s;
  }

  .undo-close:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
  }

  /* 移动端适配 */
  @media (max-width: 768px) {
    :global(.ace_editor) {
      font-size: 16px;
    }
    
    .undo-toast {
      left: 1rem;
      right: 1rem;
      transform: none;
    }
    
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-1rem);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  }

  /* 移动端快捷键栏 */
  :global(.shortcut-bar) {
    position: fixed;
    left: 0;
    right: 0;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    z-index: 1000;
    padding: 0;
    box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  }

  :global(.shortcut-bar-inner) {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
    /* 添加滚动提示渐变 */
    mask-image: linear-gradient(to right, transparent, black 12px, black calc(100% - 24px), transparent);
    -webkit-mask-image: linear-gradient(to right, transparent, black 12px, black calc(100% - 24px), transparent);
    /* 确保触摸滚动流畅 - 允许水平和垂直滑动穿透 */
    scroll-behavior: smooth;
    touch-action: pan-x pan-y;
  }

  :global(.shortcut-bar-inner::-webkit-scrollbar) {
    display: none;
  }

  :global(.shortcut-btn) {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 40px;
    height: 36px;
    padding: 0 10px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    cursor: pointer;
    transition: all 0.15s ease;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }

  :global(.shortcut-btn:active) {
    background: #e5e7eb;
    transform: scale(0.95);
  }

  :global(.shortcut-btn-paste) {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
  }

  :global(.shortcut-btn-paste:active) {
    background: #2563eb;
  }

  :global(.shortcut-divider) {
    width: 1px;
    height: 24px;
    background: #e2e8f0;
    margin: 0 6px;
    flex-shrink: 0;
  }

  /* 安全区域适配 (iPhone X 等) */
  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    :global(.shortcut-bar) {
      padding-bottom: env(safe-area-inset-bottom);
    }
  }
</style>
