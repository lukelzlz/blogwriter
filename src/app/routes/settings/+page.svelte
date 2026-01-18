<script lang="ts">
  import { auth } from '$stores/auth';
  import { repoApi } from '$lib/api';

  export let navigate: (path: string) => void = () => {};
  let owner = '';
  let repo = '';
  let postsPath = '';
  let loading = false;
  let error = '';
  let success = '';

  $: if ($auth.repo) {
    owner = $auth.repo.owner;
    repo = $auth.repo.name;
  }

  $: if ($auth.postsPath) {
    postsPath = $auth.postsPath;
  }

  async function handleSave() {
    if (!owner || !repo) {
      error = '请填写完整的仓库信息';
      return;
    }

    loading = true;
    error = '';
    success = '';

    try {
      const response = await repoApi.getInfo(owner, repo);

      if (response.success && response.data) {
        auth.setRepo(owner, repo);
        if (postsPath) {
          auth.setPostsPath(postsPath);
        }
        success = '仓库配置已保存';
        setTimeout(() => (success = ''), 3000);
      } else {
        error = response.error || '无法访问该仓库';
      }
    } catch (err) {
      error = '无法访问该仓库，请检查仓库名称和权限';
      console.error('Error verifying repo:', err);
    } finally {
      loading = false;
    }
  }
</script>

<div class="max-w-2xl mx-auto">
  <h1 class="text-3xl font-bold text-gray-900 mb-6">设置</h1>

  <div class="bg-white rounded-lg shadow-sm p-6">
    <h2 class="text-xl font-semibold mb-4">GitHub 仓库配置</h2>
    <p class="text-gray-600 mb-6">
      配置您的 Hexo 博客所在的 GitHub 仓库信息
    </p>

    {#if error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {error}
      </div>
    {/if}

    {#if success}
      <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
        {success}
      </div>
    {/if}

    <div class="space-y-4">
      <div>
        <label for="owner" class="block text-sm font-medium text-gray-700 mb-2">
          仓库所有者
        </label>
        <input
          id="owner"
          type="text"
          bind:value={owner}
          placeholder="例如: username"
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p class="text-sm text-gray-500 mt-1">
          GitHub 用户名或组织名称
        </p>
      </div>

      <div>
        <label for="repo" class="block text-sm font-medium text-gray-700 mb-2">
          仓库名称
        </label>
        <input
          id="repo"
          type="text"
          bind:value={repo}
          placeholder="例如: blog"
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p class="text-sm text-gray-500 mt-1">
          Hexo 博客仓库的名称
        </p>
      </div>

      <div>
        <label for="postsPath" class="block text-sm font-medium text-gray-700 mb-2">
          文章路径
        </label>
        <input
          id="postsPath"
          type="text"
          bind:value={postsPath}
          placeholder="例如: source/_posts"
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p class="text-sm text-gray-500 mt-1">
          Hexo 博客文章所在的目录路径（默认: source/_posts）
        </p>
      </div>

      <div class="pt-4">
        <button
          on:click={handleSave}
          disabled={loading}
          class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if loading}
            <div class="inline-block loading mr-2"></div>
            <span>保存中...</span>
          {:else}
            保存配置
          {/if}
        </button>
      </div>
    </div>

    <div class="mt-8 pt-6 border-t border-gray-200">
      <h3 class="text-lg font-semibold mb-3">当前配置</h3>
      {#if $auth.repo}
        <div class="bg-gray-50 rounded-md p-4">
          <p class="text-sm">
            <span class="font-medium">仓库:</span>
            <a
              href={`https://github.com/${$auth.repo.owner}/${$auth.repo.name}`}
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-600 hover:underline ml-1"
            >
              {$auth.repo.owner}/{$auth.repo.name}
            </a>
          </p>
          <p class="text-sm mt-2">
            <span class="font-medium">用户:</span>
            <span class="ml-1">{$auth.user?.login}</span>
          </p>
          <p class="text-sm mt-2">
            <span class="font-medium">文章路径:</span>
            <span class="ml-1">{$auth.postsPath}</span>
          </p>
        </div>
      {:else}
        <p class="text-gray-500 text-sm">尚未配置仓库</p>
      {/if}
    </div>
  </div>

  <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
    <h3 class="text-lg font-semibold mb-3 text-blue-900">
      如何获取仓库信息？
    </h3>
    <ol class="list-decimal list-inside space-y-2 text-blue-800">
      <li>访问您的 Hexo 博客仓库页面</li>
      <li>查看浏览器地址栏，例如：
        <code class="bg-blue-100 px-2 py-1 rounded text-sm">
          https://github.com/username/blog
        </code>
      </li>
      <li>
        <code class="font-medium">username</code> 就是仓库所有者
      </li>
      <li>
        <code class="font-medium">blog</code> 就是仓库名称
      </li>
    </ol>
  </div>
</div>
