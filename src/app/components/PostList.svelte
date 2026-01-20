<script lang="ts">
  import type { Post } from '$shared/types';
  import { formatFileSize, formatDate } from '$lib/utils';
  import { extractTitleFromFilename } from '$lib/hexo';

  export let posts: Post[] = [];
  export let loading = false;
  export let onEdit: (post: Post) => void = () => {};
  export let onDelete: (post: Post) => void = () => {};

  let showDeleteConfirm: Post | null = null;
</script>

<div class="post-list">
  {#if loading}
    <div class="flex items-center justify-center py-12">
      <div class="loading"></div>
      <span class="ml-3">加载中...</span>
    </div>
  {:else if posts.length === 0}
    <div class="text-center py-12 text-gray-500">
      <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <p>还没有文章</p>
      <p class="text-sm mt-2">点击"新建文章"开始创作</p>
    </div>
  {:else}
    <div class="space-y-4">
      {#each posts as post (post.path)}
        <div class="post-item bg-white rounded-lg shadow-sm hover:shadow-md transition p-4">
          <div class="flex items-start justify-between">
            <div class="flex-1 min-w-0">
              <h3 class="text-lg font-semibold text-gray-900 truncate">
                {post.frontMatter?.title || extractTitleFromFilename(post.name)}
              </h3>
              <div class="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <span class="flex items-center">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  {post.name}
                </span>
                <span class="flex items-center">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  {formatFileSize(post.size)}
                </span>
                {#if post.frontMatter?.date}
                  <span class="flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    {formatDate(post.frontMatter.date)}
                  </span>
                {/if}
              </div>
            </div>
            <div class="flex items-center space-x-2 ml-4">
              <button
                on:click={() => onEdit(post)}
                class="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition"
                title="编辑"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                on:click={() => (showDeleteConfirm = post)}
                class="p-2 text-red-600 hover:bg-red-50 rounded-md transition"
                title="删除"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Delete Confirmation Modal -->
  {#if showDeleteConfirm}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <h3 class="text-lg font-semibold mb-4">确认删除</h3>
        <p class="text-gray-600 mb-6">
          确定要删除文章 "{showDeleteConfirm.frontMatter?.title || extractTitleFromFilename(showDeleteConfirm.name)
          }" 吗？此操作无法撤销。
        </p>
        <div class="flex justify-end space-x-3">
          <button
            on:click={() => (showDeleteConfirm = null)}
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition"
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
            class="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md transition"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .post-list {
    min-height: 200px;
  }
</style>
