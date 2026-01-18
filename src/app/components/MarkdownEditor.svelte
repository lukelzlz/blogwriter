<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { markdown } from '@codemirror/lang-markdown';
  import { oneDark } from '@codemirror/theme-one-dark';

  export let content = '';
  export let placeholder = '开始编写你的文章...';
  export let readonly = false;
  export let onChange: ((content: string) => void) | undefined = undefined;

  let editorContainer: HTMLDivElement;
  let view: EditorView;
  let isInternalUpdate = false;

  onMount(() => {
    view = new EditorView({
      doc: content,
      extensions: [
        basicSetup,
        markdown(),
        oneDark,
        EditorView.theme({
          '&': {
            height: '100%',
          },
          '.cm-scroller': {
            overflow: 'auto',
          },
          '.cm-content': {
            padding: '20px',
            fontFamily: '"Fira Code", monospace',
            fontSize: '14px',
            lineHeight: '1.6',
          },
          '.cm-editor': {
            fontSize: '14px',
          },
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !isInternalUpdate) {
            const newContent = view.state.doc.toString();
            if (onChange) {
              onChange(newContent);
            }
          }
        }),
      ],
      parent: editorContainer,
      readonly,
    });

    return () => {
      if (view) {
        view.destroy();
      }
    };
  });

  // 外部内容更新时同步到编辑器
  $: if (view && content !== undefined && content !== view.state.doc.toString()) {
    isInternalUpdate = true;
    const transaction = view.state.update({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: content,
      },
    });
    view.dispatch(transaction);
    // 使用 requestAnimationFrame 在下一个事件循环中重置标志
    requestAnimationFrame(() => {
      isInternalUpdate = false;
    });
  }

  onDestroy(() => {
    if (view) {
      view.destroy();
    }
  });
</script>

<div bind:this={editorContainer} class="markdown-editor h-full"></div>

<style>
  .markdown-editor {
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .markdown-editor :global(.cm-editor) {
    height: 100%;
  }

  .markdown-editor :global(.cm-scroller) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial,
      sans-serif;
  }
</style>
