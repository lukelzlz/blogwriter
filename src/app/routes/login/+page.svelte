<script lang="ts">
  import LoginButton from '$components/LoginButton.svelte';

  // navigate 参数由 App.svelte 传入，保留以保持接口一致性
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export let navigate: (path: string) => void = () => {};
</script>

<div class="login-page">
  <div class="login-card">
    <div class="text-center mb-8">
      <svg class="w-16 h-16 mx-auto mb-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
      <h1 class="text-3xl font-bold text-gray-900">Hexo 博客管理器</h1>
      <p class="text-gray-600 mt-2">在移动设备上轻松管理您的 Hexo 博客</p>
    </div>

    <LoginButton />

    <div class="mt-8 pt-6 border-t border-gray-200">
      <h3 class="text-sm font-semibold text-gray-900 mb-3">功能特性</h3>
      <ul class="space-y-2 text-sm text-gray-600">
        <li class="flex items-start">
          <svg class="w-4 h-4 mr-2 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          创建、编辑、删除文章
        </li>
        <li class="flex items-start">
          <svg class="w-4 h-4 mr-2 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Markdown 编辑器和实时预览
        </li>
        <li class="flex items-start">
          <svg class="w-4 h-4 mr-2 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          自动保存和草稿恢复
        </li>
        <li class="flex items-start">
          <svg class="w-4 h-4 mr-2 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          Hexo front-matter 自动生成
        </li>
        <li class="flex items-start">
          <svg class="w-4 h-4 mr-2 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          移动端友好设计
        </li>
      </ul>
    </div>
  </div>
</div>

<style>
  .login-page {
    min-height: calc(100vh - 200px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
  }

  .login-card {
    background: white;
    border-radius: 1rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    padding: 2rem;
    max-width: 400px;
    width: 100%;
  }

  @media (max-width: 640px) {
    .login-card {
      padding: 1.5rem;
    }
  }
</style>
