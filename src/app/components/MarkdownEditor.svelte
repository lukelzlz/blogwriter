<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { markdown } from '@codemirror/lang-markdown';
  import { oneDark } from '@codemirror/theme-one-dark';

  export let content = '';
  export let placeholder = '开始编写你的文章...';
  export let readonly = false;
  export let onChange: ((content: string) => void) | undefined = undefined;

  let editorContainer: HTMLDivElement;
  let view: EditorView;
  let internalUpdate = false;

  onMount(() => {
    console.log('[MarkdownEditor] onMount called, content:', content);
    console.log('[MarkdownEditor] editorContainer:', editorContainer);
    console.log('[MarkdownEditor] readonly:', readonly);

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
          console.log('[MarkdownEditor] Update listener called, docChanged:', update.docChanged, 'internalUpdate:', internalUpdate);
          if (update.docChanged && !internalUpdate) {
            const newContent = view.state.doc.toString();
            console.log('[MarkdownEditor] Content changed, calling onChange');
            if (onChange) {
              onChange(newContent);
            }
          }
        }),
      ],
      parent: editorContainer,
      readonly,
    });

    console.log('[MarkdownEditor] EditorView created:', view);

    return () => {
      if (view) {
        view.destroy();
      }
    };
  });

  // 外部内容更新时同步到编辑器
  $: if (view && content !== undefined && !internalUpdate && content !== view.state.doc.toString()) {
    console.log('[MarkdownEditor] External content update detected');
    internalUpdate = true;
    const transaction = view.state.update({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: content,
      },
    });
    view.dispatch(transaction);
    tick().then(() => {
      internalUpdate = false;
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
