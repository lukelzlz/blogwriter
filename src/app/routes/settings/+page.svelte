<script lang="ts">
  import { auth } from '$stores/auth';
  import { repoApi } from '$lib/api';
  import { S3_PROVIDERS, getDefaultS3Config } from '$lib/s3-presets';
  import type { S3Config } from '$shared/types';

  export let navigate: (path: string) => void = () => {};
  let owner = '';
  let repo = 'blog';
  let postsPath = '';
  let loading = false;
  let error = '';
  let success = '';

  // S3 配置
  let s3Config: S3Config = getDefaultS3Config();
  let s3Loading = false;
  let s3Error = '';
  let s3Success = '';
  let showSecretKey = false;

  // 设置默认值：仓库所有者默认为用户ID，仓库名称默认为"blog"
  $: if ($auth.repo) {
    owner = $auth.repo.owner;
    repo = $auth.repo.name;
  } else if ($auth.user?.login && !owner) {
    owner = $auth.user.login;
  }

  $: if ($auth.postsPath) {
    postsPath = $auth.postsPath;
  }

  // 恢复 S3 配置
  $: if ($auth.s3Config) {
    s3Config = { ...$auth.s3Config };
  }

  // 当服务商改变时，更新 forcePathStyle 和清空区域
  function handleProviderChange() {
    const provider = S3_PROVIDERS[s3Config.provider];
    if (provider) {
      s3Config.forcePathStyle = provider.forcePathStyle;
      s3Config.region = '';
      s3Config.endpoint = '';
    }
  }

  // 当区域改变时，更新 endpoint
  function handleRegionChange() {
    const provider = S3_PROVIDERS[s3Config.provider];
    if (provider) {
      const region = provider.regions.find(r => r.id === s3Config.region);
      if (region && region.endpoint) {
        s3Config.endpoint = region.endpoint;
      }
    }
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

  function handleSaveS3Config() {
    // 验证必填字段
    if (!s3Config.provider) {
      s3Error = '请选择存储服务商';
      return;
    }
    if (!s3Config.endpoint) {
      s3Error = '请填写 Endpoint';
      return;
    }
    if (!s3Config.region) {
      s3Error = '请选择或填写区域';
      return;
    }
    if (!s3Config.accessKeyId) {
      s3Error = '请填写 Access Key ID';
      return;
    }
    if (!s3Config.secretAccessKey) {
      s3Error = '请填写 Secret Access Key';
      return;
    }
    if (!s3Config.bucket) {
      s3Error = '请填写 Bucket 名称';
      return;
    }
    if (!s3Config.publicUrl) {
      s3Error = '请填写公开访问 URL';
      return;
    }

    s3Loading = true;
    s3Error = '';
    s3Success = '';

    try {
      auth.setS3Config(s3Config);
      s3Success = '图床配置已保存';
      setTimeout(() => (s3Success = ''), 3000);
    } catch (err) {
      s3Error = '保存配置失败';
      console.error('Error saving S3 config:', err);
    } finally {
      s3Loading = false;
    }
  }

  function handleClearS3Config() {
    if (confirm('确定要清除图床配置吗？')) {
      auth.setS3Config(null);
      s3Config = getDefaultS3Config();
      s3Success = '图床配置已清除';
      setTimeout(() => (s3Success = ''), 3000);
    }
  }

  // 配置导入导出
  let importExportError = '';
  let importExportSuccess = '';
  let importConfigText = '';
  let showImportModal = false;

  interface ExportConfig {
    version: number;
    repo: { owner: string; name: string } | null;
    postsPath: string;
    s3Config: S3Config | null;
  }

  function handleExportConfig() {
    importExportError = '';
    importExportSuccess = '';

    try {
      const config: ExportConfig = {
        version: 1,
        repo: $auth.repo,
        postsPath: $auth.postsPath,
        s3Config: $auth.s3Config,
      };

      const jsonStr = JSON.stringify(config);
      const base64Str = btoa(unescape(encodeURIComponent(jsonStr)));

      // 复制到剪贴板
      navigator.clipboard.writeText(base64Str).then(() => {
        importExportSuccess = '配置已导出并复制到剪贴板';
        setTimeout(() => (importExportSuccess = ''), 3000);
      }).catch(() => {
        // 如果剪贴板不可用，显示配置字符串
        prompt('请复制以下配置字符串：', base64Str);
      });
    } catch (err) {
      importExportError = '导出配置失败';
      console.error('Export config error:', err);
    }
  }

  function handleOpenImportModal() {
    importConfigText = '';
    importExportError = '';
    importExportSuccess = '';
    showImportModal = true;
  }

  function handleCloseImportModal() {
    showImportModal = false;
    importConfigText = '';
  }

  async function handleImportConfig() {
    importExportError = '';
    importExportSuccess = '';

    if (!importConfigText.trim()) {
      importExportError = '请输入配置字符串';
      return;
    }

    try {
      const jsonStr = decodeURIComponent(escape(atob(importConfigText.trim())));
      const config: ExportConfig = JSON.parse(jsonStr);

      // 验证配置版本
      if (!config.version || config.version !== 1) {
        importExportError = '配置格式不正确或版本不兼容';
        return;
      }

      // 导入仓库配置
      if (config.repo) {
        auth.setRepo(config.repo.owner, config.repo.name);
        owner = config.repo.owner;
        repo = config.repo.name;
      }

      // 导入文章路径
      if (config.postsPath) {
        auth.setPostsPath(config.postsPath);
        postsPath = config.postsPath;
      }

      // 导入 S3 配置
      if (config.s3Config) {
        auth.setS3Config(config.s3Config);
        s3Config = { ...config.s3Config };
      }

      showImportModal = false;
      importConfigText = '';
      importExportSuccess = '配置导入成功';
      setTimeout(() => (importExportSuccess = ''), 3000);
    } catch (err) {
      importExportError = '配置解析失败，请检查配置字符串是否正确';
      console.error('Import config error:', err);
    }
  }

</script>

<div class="max-w-2xl mx-auto space-y-6">
  <h1 class="text-3xl font-bold text-primary-950 mb-6">设置</h1>

  <!-- GitHub 仓库配置 -->
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
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
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
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <p class="text-sm text-gray-500 mt-1">
          Hexo 博客文章所在的目录路径（默认: source/_posts）
        </p>
      </div>

      <div class="pt-4">
        <button
          on:click={handleSave}
          disabled={loading}
          class="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if loading}
            <span>保存中...</span>
          {:else}
            保存仓库配置
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- S3 图床配置 -->
  <div class="bg-white rounded-lg shadow-sm p-6">
    <h2 class="text-xl font-semibold mb-4">图床配置（S3 兼容存储）</h2>
    <p class="text-gray-600 mb-6">
      配置图片上传存储，支持 AWS S3、阿里云 OSS、腾讯云 COS、七牛云等 S3 兼容存储
    </p>

    {#if s3Error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {s3Error}
      </div>
    {/if}

    {#if s3Success}
      <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
        {s3Success}
      </div>
    {/if}

    <div class="space-y-4">
      <!-- 服务商选择 -->
      <div>
        <label for="s3Provider" class="block text-sm font-medium text-gray-700 mb-2">
          存储服务商
        </label>
        <select
          id="s3Provider"
          bind:value={s3Config.provider}
          on:change={handleProviderChange}
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">请选择服务商</option>
          {#each Object.entries(S3_PROVIDERS) as [key, provider]}
            <option value={key}>{provider.name}</option>
          {/each}
        </select>
      </div>

      <!-- 区域选择 -->
      {#if s3Config.provider && S3_PROVIDERS[s3Config.provider]}
        <div>
          <label for="s3Region" class="block text-sm font-medium text-gray-700 mb-2">
            区域
          </label>
          {#if S3_PROVIDERS[s3Config.provider].regions.length > 1 || S3_PROVIDERS[s3Config.provider].regions[0].endpoint}
            <select
              id="s3Region"
              bind:value={s3Config.region}
              on:change={handleRegionChange}
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">请选择区域</option>
              {#each S3_PROVIDERS[s3Config.provider].regions as region}
                <option value={region.id}>{region.name}</option>
              {/each}
            </select>
          {:else}
            <input
              id="s3Region"
              type="text"
              bind:value={s3Config.region}
              placeholder="例如: us-east-1"
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          {/if}
        </div>
      {/if}

      <!-- Endpoint -->
      <div>
        <label for="s3Endpoint" class="block text-sm font-medium text-gray-700 mb-2">
          Endpoint
        </label>
        <input
          id="s3Endpoint"
          type="text"
          bind:value={s3Config.endpoint}
          placeholder="例如: s3.us-east-1.amazonaws.com"
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <p class="text-sm text-gray-500 mt-1">
          S3 服务端点地址（不含 https://）
        </p>
      </div>

      <!-- Access Key ID -->
      <div>
        <label for="s3AccessKeyId" class="block text-sm font-medium text-gray-700 mb-2">
          Access Key ID
        </label>
        <input
          id="s3AccessKeyId"
          type="text"
          bind:value={s3Config.accessKeyId}
          placeholder="输入 Access Key ID"
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <!-- Secret Access Key -->
      <div>
        <label for="s3SecretAccessKey" class="block text-sm font-medium text-gray-700 mb-2">
          Secret Access Key
        </label>
        <div class="relative">
          {#if showSecretKey}
            <input
              id="s3SecretAccessKey"
              type="text"
              bind:value={s3Config.secretAccessKey}
              placeholder="输入 Secret Access Key"
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 pr-12"
            />
          {:else}
            <input
              id="s3SecretAccessKey"
              type="password"
              bind:value={s3Config.secretAccessKey}
              placeholder="输入 Secret Access Key"
              class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 pr-12"
            />
          {/if}
          <button
            type="button"
            on:click={() => showSecretKey = !showSecretKey}
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {#if showSecretKey}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd" />
                <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
              </svg>
            {/if}
          </button>
        </div>
        <p class="text-sm text-gray-500 mt-1">
          密钥仅存储在本地浏览器中
        </p>
      </div>

      <!-- Bucket -->
      <div>
        <label for="s3Bucket" class="block text-sm font-medium text-gray-700 mb-2">
          Bucket 名称
        </label>
        <input
          id="s3Bucket"
          type="text"
          bind:value={s3Config.bucket}
          placeholder="输入存储桶名称"
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <!-- 公开访问 URL -->
      <div>
        <label for="s3PublicUrl" class="block text-sm font-medium text-gray-700 mb-2">
          公开访问 URL
        </label>
        <input
          id="s3PublicUrl"
          type="text"
          bind:value={s3Config.publicUrl}
          placeholder="例如: https://cdn.example.com"
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <p class="text-sm text-gray-500 mt-1">
          图片的公开访问域名（CDN 域名或存储桶公开 URL）
        </p>
      </div>

      <!-- 路径前缀 -->
      <div>
        <label for="s3PathPrefix" class="block text-sm font-medium text-gray-700 mb-2">
          路径前缀（可选）
        </label>
        <input
          id="s3PathPrefix"
          type="text"
          bind:value={s3Config.pathPrefix}
          placeholder="例如: blog/images"
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <p class="text-sm text-gray-500 mt-1">
          上传文件的路径前缀，不需要以 / 开头或结尾
        </p>
      </div>

      <!-- 路径风格 -->
      <div class="flex items-center">
        <input
          id="s3ForcePathStyle"
          type="checkbox"
          bind:checked={s3Config.forcePathStyle}
          class="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
        />
        <label for="s3ForcePathStyle" class="ml-2 block text-sm text-gray-700">
          使用路径风格（Path Style）
        </label>
      </div>
      <p class="text-sm text-gray-500 -mt-2 ml-6">
        MinIO、Cloudflare R2 等需要勾选此选项
      </p>

      <div class="pt-4 flex gap-4">
        <button
          on:click={handleSaveS3Config}
          disabled={s3Loading}
          class="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if s3Loading}
            <span>保存中...</span>
          {:else}
            保存图床配置
          {/if}
        </button>
        {#if $auth.s3Config}
          <button
            on:click={handleClearS3Config}
            class="px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-md transition"
          >
            清除配置
          </button>
        {/if}
      </div>
    </div>

    <!-- 当前 S3 配置状态 -->
    {#if $auth.s3Config}
      <div class="mt-6 pt-6 border-t border-gray-200">
        <h3 class="text-lg font-semibold mb-3">当前图床配置</h3>
        <div class="bg-gray-50 rounded-md p-4 space-y-2">
          <p class="text-sm">
            <span class="font-medium">服务商:</span>
            <span class="ml-1">{S3_PROVIDERS[$auth.s3Config.provider]?.name || $auth.s3Config.provider}</span>
          </p>
          <p class="text-sm">
            <span class="font-medium">区域:</span>
            <span class="ml-1">{$auth.s3Config.region}</span>
          </p>
          <p class="text-sm">
            <span class="font-medium">Bucket:</span>
            <span class="ml-1">{$auth.s3Config.bucket}</span>
          </p>
          <p class="text-sm">
            <span class="font-medium">公开 URL:</span>
            <span class="ml-1">{$auth.s3Config.publicUrl}</span>
          </p>
          {#if $auth.s3Config.pathPrefix}
            <p class="text-sm">
              <span class="font-medium">路径前缀:</span>
              <span class="ml-1">{$auth.s3Config.pathPrefix}</span>
            </p>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- 当前仓库配置 -->
  <div class="bg-white rounded-lg shadow-sm p-6">
    <h3 class="text-lg font-semibold mb-3">当前仓库配置</h3>
    {#if $auth.repo}
      <div class="bg-gray-50 rounded-md p-4">
        <p class="text-sm">
          <span class="font-medium">仓库:</span>
          <a
            href={`https://github.com/${$auth.repo.owner}/${$auth.repo.name}`}
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary-600 hover:underline ml-1"
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

  <!-- 配置导入导出 -->
  <div class="bg-white rounded-lg shadow-sm p-6">
    <h2 class="text-xl font-semibold mb-4">配置导入导出</h2>
    <p class="text-gray-600 mb-6">
      一键导入或导出所有配置（仓库信息和图床配置），方便在不同设备间同步
    </p>

    {#if importExportError}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {importExportError}
      </div>
    {/if}

    {#if importExportSuccess}
      <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
        {importExportSuccess}
      </div>
    {/if}

    <div class="flex gap-4">
      <button
        on:click={handleExportConfig}
        class="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
        </svg>
        导出配置
      </button>
      <button
        on:click={handleOpenImportModal}
        class="flex-1 border border-primary-600 text-primary-600 hover:bg-primary-50 font-medium py-2 px-4 rounded-md transition flex items-center justify-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" />
        </svg>
        导入配置
      </button>
    </div>

    <p class="text-sm text-gray-500 mt-4">
      配置使用 Base64 编码，不包含加密。请妥善保管导出的配置字符串，其中包含敏感信息。
    </p>
  </div>

  <!-- 导入配置弹窗 -->
  {#if showImportModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h3 class="text-lg font-semibold mb-4">导入配置</h3>
        
        {#if importExportError}
          <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
            {importExportError}
          </div>
        {/if}

        <div class="mb-4">
          <label for="importConfig" class="block text-sm font-medium text-gray-700 mb-2">
            配置字符串
          </label>
          <textarea
            id="importConfig"
            bind:value={importConfigText}
            placeholder="粘贴导出的配置字符串..."
            rows="4"
            class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
          ></textarea>
        </div>

        <div class="flex gap-3">
          <button
            on:click={handleImportConfig}
            class="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition"
          >
            确认导入
          </button>
          <button
            on:click={handleCloseImportModal}
            class="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-md transition"
          >
            取消
          </button>
        </div>

        <p class="text-xs text-gray-500 mt-4">
          导入将覆盖当前的仓库配置和图床配置
        </p>
      </div>
    </div>
  {/if}

  <!-- 帮助信息 -->
  <div class="bg-primary-50 border border-primary-200 rounded-lg p-6">
    <h3 class="text-lg font-semibold mb-3 text-primary-900">
      如何获取仓库信息？
    </h3>
    <ol class="list-decimal list-inside space-y-2 text-primary-800">
      <li>访问您的 Hexo 博客仓库页面</li>
      <li>查看浏览器地址栏，例如：
        <code class="bg-primary-100 px-2 py-1 rounded text-sm">
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

  <div class="bg-primary-50 border border-primary-200 rounded-lg p-6">
    <h3 class="text-lg font-semibold mb-3 text-primary-900">
      图床使用说明
    </h3>
    <ul class="list-disc list-inside space-y-2 text-primary-800">
      <li>配置完成后，在编辑器中可以直接 <strong>粘贴图片</strong>（Ctrl+V）自动上传</li>
      <li>也可以将图片 <strong>拖拽</strong> 到编辑器区域上传</li>
      <li>上传成功后会自动插入 Markdown 图片语法</li>
      <li>密钥信息仅存储在您的浏览器本地，不会上传到服务器</li>
    </ul>
  </div>
</div>
