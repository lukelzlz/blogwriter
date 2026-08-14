<script lang="ts">
  import type { Post } from '$shared/types';
  import { formatFileSize, formatDate } from '$lib/utils';
  import { extractTitleFromFilename } from '$lib/hexo';

  export let posts: Post[] = [];
  export let loading = false;
  export let onEdit: (post: Post) => void = () => {};
  export let onDelete: (post: Post) => void = () => {};

  let showDeleteConfirm: Post | null = null;

  // 尝试解码文件名
  function decodeFilename(filename: string): string {
    try {
      return decodeURIComponent(filename);
    } catch {
      return filename;
    }
  }

  // 获取显示标题：优先使用 frontMatter.title，否则从文件名提取
  function getDisplayTitle(post: Post): string {
    if (post.frontMatter?.title) {
      return post.frontMatter.title;
    }
    const decodedName = decodeFilename(post.name);
    return extractTitleFromFilename(decodedName);
  }
</script>

<div class="post-list">
  {#if loading}
    <div class="flex flex-col items-center justify-center py-20 text-zinc-400">
      <div class="loading !w-6 !h-6 !border-zinc-300 !border-t-zinc-900 mb-3"></div>
      <span class="text-xs font-medium tracking-wide text-zinc-500">正在同步文章列表...</span>
    </div>
  {:else if posts.length === 0}
    <div class="text-center py-20 bg-white rounded-2xl border border-zinc-200/80 p-8">
      <div class="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4 text-zinc-400">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      </div>
      <h3 class="text-base font-semibold text-zinc-900 mb-1">暂无文章</h3>
      <p class="text-xs text-zinc-500 max-w-xs mx-auto">
        当前仓库目录下尚未发现 Hexo 博文，点击右上角「新建文章」开始撰写第一篇内容。
      </p>
    </div>
  {:else}
    <div class="divide-y divide-zinc-200/80 bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
      {#each posts as post (post.path)}
        <div class="group p-5 sm:p-6 hover:bg-zinc-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <!-- 文章主体信息 -->
          <div class="flex-1 min-w-0 cursor-pointer" on:click={() => onEdit(post)} on:keydown={(e) => e.key === 'Enter' && onEdit(post)} role="button" tabindex="0">
            <h2 class="text-base sm:text-lg font-semibold tracking-tight text-zinc-900 group-hover:text-zinc-950 transition">
              {getDisplayTitle(post)}
            </h2>
            
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-zinc-500 font-normal">
              {#if post.frontMatter?.date}
                <span class="inline-flex items-center gap-1">
                  <svg class="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{formatDate(post.frontMatter.date)}</span>
                </span>
                <span class="text-zinc-300">·</span>
              {/if}

              <span class="inline-flex items-center gap-1 font-mono text-[11px] text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded">
                {post.name}
              </span>

              <span class="text-zinc-300">·</span>

              <span class="text-zinc-600 font-mono text-[11px]">
                {formatFileSize(post.size)}
              </span>
            </div>
          </div>

          <!-- 操作按钮区 (移动端舒适热区) -->
          <div class="flex items-center gap-1 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 w-full sm:w-auto justify-end">
            <button
              on:click|stopPropagation={() => onEdit(post)}
              class="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 active:bg-zinc-200 transition"
              title="编辑文章"
              aria-label="编辑文章"
            >
              <svg class="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span>编辑</span>
            </button>

            <button
              on:click|stopPropagation={() => (showDeleteConfirm = post)}
              class="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium text-zinc-600 hover:text-red-600 hover:bg-red-50 active:bg-red-100 transition"
              title="删除文章"
              aria-label="删除文章"
            >
              <svg class="w-4 h-4 text-zinc-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>删除</span>
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- 极简删除确认 Modal -->
  {#if showDeleteConfirm}
    <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div class="bg-white rounded-2xl shadow-xl border border-zinc-200 p-6 max-w-sm w-full mx-auto animate-slide-up">
        <div class="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-4">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>

        <h3 class="text-base font-bold text-zinc-900 mb-1.5">确认删除此文章？</h3>
        <p class="text-xs text-zinc-500 mb-6 leading-relaxed">
          即将从 GitHub 仓库中永久删除文章 <span class="font-medium text-zinc-900">"{getDisplayTitle(showDeleteConfirm)}"</span>。此操作不可撤销。
        </p>

        <div class="flex items-center justify-end gap-2.5">
          <button
            on:click={() => (showDeleteConfirm = null)}
            class="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition"
          >
            取消
          </button>
          <button
            on:click={() => {
              if (showDeleteConfirm) {
                onDelete(showDeleteConfirm);
              }
              showDeleteConfirm = null;
            }}
            class="px-4 py-2 text-xs font-semibold bg-red-600 text-white hover:bg-red-700 rounded-lg transition shadow-sm active:scale-95"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
