<script lang="ts">
  export let content = '';
  export let placeholder = '开始编写你的文章...';
  export let readonly = false;
  export let onChange: ((content: string) => void) | undefined = undefined;

  let textarea: HTMLTextAreaElement;
  let lineNumbers: HTMLDivElement;
  let isInternalUpdate = false;

  function updateLineNumbers() {
    if (!textarea || !lineNumbers) return;

    const lines = textarea.value.split('\n').length;
    lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('<br>');
  }

  function handleInput() {
    if (onChange && !isInternalUpdate) {
      onChange(textarea.value);
    }
    updateLineNumbers();
  }

  function handleScroll() {
    if (lineNumbers && textarea) {
      lineNumbers.scrollTop = textarea.scrollTop;
    }
  }

  function syncScroll() {
    if (lineNumbers && textarea) {
      textarea.scrollTop = lineNumbers.scrollTop;
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
  $: if (textarea && content !== undefined && content !== textarea.value && !isInternalUpdate) {
    isInternalUpdate = true;
    textarea.value = content;
    updateLineNumbers();
    setTimeout(() => {
      isInternalUpdate = false;
    }, 0);
  }
</script>

<div class="editor-container">
  <div class="line-numbers" bind:this={lineNumbers} on:scroll={syncScroll}>
    1
  </div>
  <textarea
    bind:this={textarea}
    {readonly}
    {placeholder}
    on:input={handleInput}
    on:scroll={handleScroll}
    on:keydown={handleKeyDown}
    class="editor-textarea"
  ></textarea>
</div>

<style>
  .editor-container {
    display: flex;
    height: 100%;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    overflow: hidden;
    background: #ffffff;
  }

  .line-numbers {
    min-width: 50px;
    max-width: 50px;
    padding: 16px 8px;
    text-align: right;
    background: #f9fafb;
    border-right: 1px solid #e5e7eb;
    color: #6b7280;
    font-family: 'Fira Code', monospace;
    font-size: 14px;
    line-height: 1.6;
    user-select: none;
    overflow: hidden;
  }

  .editor-textarea {
    flex: 1;
    padding: 16px;
    border: none;
    outline: none;
    resize: none;
    font-family: 'Fira Code', monospace;
    font-size: 14px;
    line-height: 1.6;
    background: #ffffff;
    color: #1f2937;
    white-space: pre;
    overflow-wrap: normal;
    overflow-x: auto;
  }

  .editor-textarea::placeholder {
    color: #9ca3af;
  }

  .editor-textarea:read-only {
    background: #f9fafb;
    cursor: default;
  }
</style>
