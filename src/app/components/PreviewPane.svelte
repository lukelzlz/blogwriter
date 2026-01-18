<script lang="ts">
  import { marked } from 'marked';
  import { onMount } from 'svelte';

  export let content = '';
  let previewContainer: HTMLDivElement;

  onMount(() => {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  });

  $: {
    console.log('[PreviewPane] Content updated, length:', content?.length || 0);
    try {
      htmlContent = marked.parse(content);
      console.log('[PreviewPane] marked.parse succeeded');
    } catch (error) {
      console.error('[PreviewPane] marked.parse error:', error);
    }
  }
</script>

<div bind:this={previewContainer} class="markdown-preview">
  {@html htmlContent}
</div>

<style>
  .markdown-preview {
    height: 100%;
    overflow-y: auto;
    background-color: #ffffff;
  }
</style>
