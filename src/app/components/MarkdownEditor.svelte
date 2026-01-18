<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorView, basicSetup } from 'codemirror';
  import { markdown } from '@codemirror/lang-markdown';
  import { oneDark } from '@codemirror/theme-one-dark';

  export let content = '';
  export let placeholder = '开始编写你的文章...';
  export let readonly = false;

  let editorContainer: HTMLDivElement;
  let view: EditorView;

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
