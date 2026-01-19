<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import ace from 'ace-builds';
  import 'ace-builds/src-noconflict/mode-markdown';
  import 'ace-builds/src-noconflict/theme-github';

  export let content = '';
  export let placeholder = '开始编写你的文章...';
  export let readonly = false;
  export let onChange: ((content: string) => void) | undefined = undefined;

  let editorContainer: HTMLDivElement;
  let editor: any;
  let isInternalUpdate = false;
  let lastExternalContent = '';
  let lastReadonly = false;

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
        onChange(newContent);
      }
    });

    console.log('[MarkdownEditor] Setup complete');

    return () => {
      if (editor) {
        editor.destroy();
      }
    };
  });

  // 外部内容更新时同步到编辑器
  $: if (editor && content !== lastExternalContent) {
    console.log('[MarkdownEditor] External content update detected:', content);
    isInternalUpdate = true;
    lastExternalContent = content;
    editor.setValue(content, -1);
    tick().then(() => {
      isInternalUpdate = false;
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
      editor.destroy();
    }
  });
</script>

<div bind:this={editorContainer} class="editor-container"></div>

<style>
  .editor-container {
    width: 100%;
    height: 100%;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    overflow: hidden;
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
