<script lang="ts">
  import { marked } from 'marked';
  import { onMount } from 'svelte';

  export let content = '';
  let previewContainer: HTMLDivElement;
  let htmlContent = '';

  onMount(() => {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  });

  $: htmlContent = marked.parse(content);
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
