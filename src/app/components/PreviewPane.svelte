<script lang="ts">
  import { marked } from 'marked';
  import { onMount } from 'svelte';

  export let content = '';
  let htmlContent = '';

  onMount(() => {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  });

  // 处理 marked.parse() 可能返回 Promise 的情况
  $: {
    const result = marked.parse(content);
    if (result instanceof Promise) {
      result.then((html) => {
        htmlContent = html;
      });
    } else {
      htmlContent = result;
    }
  }
</script>

<div class="markdown-preview">
  {@html htmlContent}
</div>

<style>
  .markdown-preview {
    height: 100%;
    overflow-y: auto;
    background-color: #ffffff;
  }
</style>
