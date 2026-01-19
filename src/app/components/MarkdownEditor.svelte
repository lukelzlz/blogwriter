<script lang="ts">
  export let content = '';
  export let placeholder = '开始编写你的文章...';
  export let readonly = false;
  export let onChange: ((content: string) => void) | undefined = undefined;

  let textarea: HTMLTextAreaElement;

  function handleInput() {
    if (onChange) {
      onChange(textarea.value);
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Tab') {
      event.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 2;
      handleInput();
    }
  }

  // 外部内容更新时同步到 textarea
  $: if (textarea && content !== textarea.value) {
    textarea.value = content;
  }
</script>

<textarea
  bind:this={textarea}
  {readonly}
  {placeholder}
  on:input={handleInput}
  on:keydown={handleKeyDown}
  class="editor-textarea"
></textarea>

<style>
  .editor-textarea {
    width: 100%;
    height: 100%;
    padding: 16px;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    outline: none;
    resize: none;
    font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
    font-size: 14px;
    line-height: 1.6;
    background: #ffffff;
    color: #1f2937;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-y: auto;
    box-sizing: border-box;
  }

  .editor-textarea::placeholder {
    color: #9ca3af;
  }

  .editor-textarea:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .editor-textarea:read-only {
    background: #f9fafb;
    cursor: default;
  }

  /* 移动端适配 */
  @media (max-width: 768px) {
    .editor-textarea {
      font-size: 16px;
      padding: 12px;
      line-height: 1.5;
    }
  }
</style>
