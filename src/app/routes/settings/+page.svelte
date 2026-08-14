<script lang="ts">
  import { onMount } from 'svelte';
  import { auth } from '$stores/auth';
  import { repoApi } from '$lib/api';
  import { S3_PROVIDERS, getDefaultS3Config } from '$lib/s3-presets';
  import type { S3Config, ImageStorageProvider, GitHubImageConfig } from '$shared/types';

  export let navigate: (path: string) => void = () => {};
  let owner = '';
  let repo = 'blog';
  let postsPath = '';
  let loading = false;
  let error = '';
  let success = '';

  // 图床服务商类型
  let imageStorageProvider: ImageStorageProvider = 'github';

  // GitHub 图床配置
  let githubImageConfig: GitHubImageConfig = { pathPrefix: 'source/images' };
  let ghImageLoading = false;
  let ghImageError = '';
  let ghImageSuccess = '';

  // S3 配置
  let s3Config: S3Config = getDefaultS3Config();
  let s3Loading = false;
  let s3Error = '';
  let s3Success = '';
  let showSecretKey = false;

  onMount(() => {
    if ($auth.repo) {
      owner = $auth.repo.owner;
      repo = $auth.repo.name;
    } else if ($auth.user?.login) {
      owner = $auth.user.login;
    }

    if ($auth.postsPath) {
      postsPath = $auth.postsPath;
    }

    if ($auth.imageStorageProvider) {
      imageStorageProvider = $auth.imageStorageProvider;
    }

    if ($auth.githubImageConfig) {
      githubImageConfig = { ...$auth.githubImageConfig };
    }

    if ($auth.s3Config) {
      s3Config = { ...$auth.s3Config };
    }
  });

  function handleSelectProvider(provider: ImageStorageProvider) {
    imageStorageProvider = provider;
    auth.setImageStorageProvider(provider);
  }

  function handleSaveGitHubImageConfig() {
    ghImageLoading = true;
    ghImageError = '';
    ghImageSuccess = '';

    try {
      if (!githubImageConfig.pathPrefix?.trim()) {
        githubImageConfig.pathPrefix = 'source/images';
      }
      auth.setImageStorageProvider('github');
      auth.setGitHubImageConfig({
        pathPrefix: githubImageConfig.pathPrefix.trim(),
        branch: githubImageConfig.branch?.trim() || undefined,
      });
      ghImageSuccess = 'GitHub 仓库图床配置已保存';
      setTimeout(() => (ghImageSuccess = ''), 3000);
    } catch (err) {
      ghImageError = '保存配置失败';
      console.error('Error saving GitHub image config:', err);
    } finally {
      ghImageLoading = false;
    }
  }

  function handleProviderChange() {
    const provider = S3_PROVIDERS[s3Config.provider];
    if (provider) {
      s3Config.forcePathStyle = provider.forcePathStyle;
      s3Config.region = '';
      s3Config.endpoint = '';
    }
  }

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
      auth.setImageStorageProvider('s3');
      auth.setS3Config(s3Config);
      s3Success = 'S3 图床配置已保存并设为当前生效图床';
      setTimeout(() => (s3Success = ''), 3000);
    } catch (err) {
      s3Error = '保存配置失败';
      console.error('Error saving S3 config:', err);
    } finally {
      s3Loading = false;
    }
  }

  function handleClearS3Config() {
    if (confirm('确定要清除 S3 图床配置吗？')) {
      auth.setS3Config(null);
      s3Config = getDefaultS3Config();
      s3Success = 'S3 图床配置已清除';
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
    imageStorageProvider?: ImageStorageProvider;
    githubImageConfig?: GitHubImageConfig;
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
        imageStorageProvider: $auth.imageStorageProvider,
        githubImageConfig: $auth.githubImageConfig,
        s3Config: $auth.s3Config,
      };

      const jsonStr = JSON.stringify(config);
      const base64Str = btoa(unescape(encodeURIComponent(jsonStr)));

      navigator.clipboard.writeText(base64Str).then(() => {
        importExportSuccess = '配置已导出并复制到剪贴板';
        setTimeout(() => (importExportSuccess = ''), 3000);
      }).catch(() => {
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

      if (!config.version || config.version !== 1) {
        importExportError = '配置格式不正确或版本不兼容';
        return;
      }

      if (config.repo) {
        auth.setRepo(config.repo.owner, config.repo.name);
        owner = config.repo.owner;
        repo = config.repo.name;
      }

      if (config.postsPath) {
        auth.setPostsPath(config.postsPath);
        postsPath = config.postsPath;
      }

      if (config.imageStorageProvider) {
        auth.setImageStorageProvider(config.imageStorageProvider);
        imageStorageProvider = config.imageStorageProvider;
      }

      if (config.githubImageConfig) {
        auth.setGitHubImageConfig(config.githubImageConfig);
        githubImageConfig = { ...config.githubImageConfig };
      }

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

<div class="max-w-2xl mx-auto space-y-8 pb-12">
  <!-- 顶栏标题 -->
  <div class="flex items-center justify-between pb-4 border-b border-zinc-200/80">
    <div>
      <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">配置与设置</h1>
      <p class="text-xs text-zinc-500 mt-1">管理博客仓库绑定、图床存储以及跨设备配置导入导出</p>
    </div>
    <button
      on:click={() => navigate('/')}
      class="text-xs font-medium text-zinc-600 hover:text-zinc-950 flex items-center gap-1 py-1.5 px-2.5 rounded-lg hover:bg-zinc-100 transition"
    >
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      <span>返回文章列表</span>
    </button>
  </div>

  <!-- 1. GitHub 仓库配置 -->
  <div class="bg-white rounded-2xl border border-zinc-200/80 p-6 sm:p-8 shadow-sm">
    <div class="flex items-center gap-2.5 mb-2">
      <div class="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center text-white">
        <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" />
        </svg>
      </div>
      <h2 class="text-lg font-bold text-zinc-900">GitHub 博客仓库</h2>
    </div>
    <p class="text-xs text-zinc-500 mb-6">
      配置存放 Hexo 博客源码与文章文件的目标 GitHub 仓库
    </p>

    {#if error}
      <div class="bg-zinc-50 border border-red-200 text-red-600 text-xs px-4 py-3 rounded-lg mb-5 flex items-center gap-2">
        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" stroke-width="2"/>
          <line x1="12" y1="8" x2="12" y2="12" stroke-width="2"/>
        </svg>
        <span>{error}</span>
      </div>
    {/if}

    {#if success}
      <div class="bg-zinc-50 border border-emerald-200 text-emerald-700 text-xs px-4 py-3 rounded-lg mb-5 flex items-center gap-2">
        <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        <span>{success}</span>
      </div>
    {/if}

    <div class="space-y-4">
      <div>
        <label for="owner" class="block text-xs font-semibold text-zinc-700 mb-1.5">
          仓库所有者 (Owner)
        </label>
        <input
          id="owner"
          type="text"
          bind:value={owner}
          placeholder="例如: username"
          class="w-full px-3.5 py-2 text-sm border border-zinc-200 rounded-lg focus:border-zinc-900"
        />
        <p class="text-[11px] text-zinc-400 mt-1">你的 GitHub 用户名或 Organization 名称</p>
      </div>

      <div>
        <label for="repo" class="block text-xs font-semibold text-zinc-700 mb-1.5">
          仓库名称 (Repository)
        </label>
        <input
          id="repo"
          type="text"
          bind:value={repo}
          placeholder="例如: blog"
          class="w-full px-3.5 py-2 text-sm border border-zinc-200 rounded-lg focus:border-zinc-900"
        />
        <p class="text-[11px] text-zinc-400 mt-1">存放 Hexo 项目的仓库名</p>
      </div>

      <div>
        <label for="postsPath" class="block text-xs font-semibold text-zinc-700 mb-1.5">
          文章存放目录 (Posts Path)
        </label>
        <input
          id="postsPath"
          type="text"
          bind:value={postsPath}
          placeholder="source/_posts"
          class="w-full px-3.5 py-2 text-sm font-mono border border-zinc-200 rounded-lg focus:border-zinc-900"
        />
        <p class="text-[11px] text-zinc-400 mt-1">Hexo 文章 Markdown 存放路径，默认值为 source/_posts</p>
      </div>

      <div class="pt-3">
        <button
          on:click={handleSave}
          disabled={loading}
          class="w-full bg-zinc-900 hover:bg-black text-white text-xs font-semibold py-2.5 px-4 rounded-lg transition shadow-sm active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {#if loading}
            <div class="loading !w-3 !h-3 !border-white/30 !border-t-white"></div>
            <span>校验与保存中...</span>
          {:else}
            <span>保存仓库配置</span>
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- 2. 图床存储配置 -->
  <div class="bg-white rounded-2xl border border-zinc-200/80 p-6 sm:p-8 shadow-sm">
    <div class="flex items-start justify-between gap-2 mb-2">
      <div class="flex items-center gap-2.5">
        <div class="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center text-white">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 class="text-lg font-bold text-zinc-900">图床存储服务</h2>
      </div>
      <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-zinc-100 text-zinc-700 border border-zinc-200">
        生效: {imageStorageProvider === 'github' ? 'GitHub 仓库' : 'S3 云存储'}
      </span>
    </div>
    <p class="text-xs text-zinc-500 mb-6">
      配置粘贴或拖拽上传插图的存储目标，支持直接写入博客仓库或第三方云存储
    </p>

    <!-- Provider 切换 Segmented Tab -->
    <div class="bg-zinc-100 p-1 rounded-xl flex gap-1 mb-6">
      <button
        type="button"
        on:click={() => handleSelectProvider('github')}
        class="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 {imageStorageProvider === 'github' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'}"
      >
        <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 16 16">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
        </svg>
        <span>GitHub 仓库图床 (推荐)</span>
      </button>
      <button
        type="button"
        on:click={() => handleSelectProvider('s3')}
        class="flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 {imageStorageProvider === 's3' ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-600 hover:text-zinc-900'}"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
        </svg>
        <span>S3 / R2 云存储</span>
      </button>
    </div>

    <!-- GitHub 图床配置面板 -->
    {#if imageStorageProvider === 'github'}
      <div class="space-y-4 animate-fade-in">
        {#if ghImageError}
          <div class="bg-zinc-50 border border-red-200 text-red-600 text-xs px-4 py-3 rounded-lg">
            {ghImageError}
          </div>
        {/if}

        {#if ghImageSuccess}
          <div class="bg-zinc-50 border border-emerald-200 text-emerald-700 text-xs px-4 py-3 rounded-lg">
            {ghImageSuccess}
          </div>
        {/if}

        <div class="bg-zinc-50 rounded-xl p-4 border border-zinc-200/80 flex items-center justify-between text-xs">
          <span class="font-medium text-zinc-600">目标博客仓库:</span>
          {#if $auth.repo}
            <span class="font-mono font-semibold text-zinc-900">{$auth.repo.owner}/{$auth.repo.name}</span>
          {:else}
            <span class="text-amber-600 font-medium">请先在上方保存仓库配置</span>
          {/if}
        </div>

        <div>
          <label for="ghPathPrefix" class="block text-xs font-semibold text-zinc-700 mb-1.5">
            仓库存储目录路径
          </label>
          <input
            id="ghPathPrefix"
            type="text"
            bind:value={githubImageConfig.pathPrefix}
            placeholder="source/images"
            class="w-full px-3.5 py-2 text-sm font-mono border border-zinc-200 rounded-lg focus:border-zinc-900"
          />
          <p class="text-[11px] text-zinc-400 mt-1">Hexo 默认将 source/images 映射为站点根 /images 访问</p>
        </div>

        <div>
          <label for="ghBranch" class="block text-xs font-semibold text-zinc-700 mb-1.5">
            目标分支 (留空使用默认分支)
          </label>
          <input
            id="ghBranch"
            type="text"
            bind:value={githubImageConfig.branch}
            placeholder="main"
            class="w-full px-3.5 py-2 text-sm font-mono border border-zinc-200 rounded-lg focus:border-zinc-900"
          />
        </div>

        <div class="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-xs text-zinc-600 space-y-1 leading-relaxed">
          <p class="font-semibold text-zinc-900">图片归档规则：</p>
          <p>• 自动按年月归档：<code class="text-zinc-800">{githubImageConfig.pathPrefix || 'source/images'}/YYYY/MM/xxx.png</code></p>
          <p>• Markdown 引用路径：<code class="text-zinc-800">![](/images/YYYY/MM/xxx.png)</code></p>
        </div>

        <div class="pt-2">
          <button
            on:click={handleSaveGitHubImageConfig}
            disabled={ghImageLoading || !$auth.repo}
            class="w-full bg-zinc-900 hover:bg-black text-white text-xs font-semibold py-2.5 px-4 rounded-lg transition shadow-sm active:scale-[0.99] disabled:opacity-50"
          >
            {ghImageLoading ? '保存中...' : '保存 GitHub 图床配置'}
          </button>
        </div>
      </div>
    {/if}

    <!-- S3 图床配置面板 -->
    {#if imageStorageProvider === 's3'}
      <div class="space-y-4 animate-fade-in">
        {#if s3Error}
          <div class="bg-zinc-50 border border-red-200 text-red-600 text-xs px-4 py-3 rounded-lg">
            {s3Error}
          </div>
        {/if}

        {#if s3Success}
          <div class="bg-zinc-50 border border-emerald-200 text-emerald-700 text-xs px-4 py-3 rounded-lg">
            {s3Success}
          </div>
        {/if}

        <div>
          <label for="s3Provider" class="block text-xs font-semibold text-zinc-700 mb-1.5">
            存储服务商 (Provider)
          </label>
          <select
            id="s3Provider"
            bind:value={s3Config.provider}
            on:change={handleProviderChange}
            class="w-full px-3.5 py-2 text-sm border border-zinc-200 rounded-lg focus:border-zinc-900 bg-white"
          >
            <option value="">请选择云存储服务商</option>
            {#each Object.entries(S3_PROVIDERS) as [key, provider]}
              <option value={key}>{provider.name}</option>
            {/each}
          </select>
        </div>

        {#if s3Config.provider && S3_PROVIDERS[s3Config.provider]}
          <div>
            <label for="s3Region" class="block text-xs font-semibold text-zinc-700 mb-1.5">
              区域 (Region)
            </label>
            {#if S3_PROVIDERS[s3Config.provider].regions.length > 1 || S3_PROVIDERS[s3Config.provider].regions[0].endpoint}
              <select
                id="s3Region"
                bind:value={s3Config.region}
                on:change={handleRegionChange}
                class="w-full px-3.5 py-2 text-sm border border-zinc-200 rounded-lg focus:border-zinc-900 bg-white"
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
                placeholder="例如: auto / us-east-1"
                class="w-full px-3.5 py-2 text-sm border border-zinc-200 rounded-lg focus:border-zinc-900"
              />
            {/if}
          </div>
        {/if}

        <div>
          <label for="s3Endpoint" class="block text-xs font-semibold text-zinc-700 mb-1.5">
            Endpoint 服务地址 (不含 https://)
          </label>
          <input
            id="s3Endpoint"
            type="text"
            bind:value={s3Config.endpoint}
            placeholder="例如: xxx.r2.cloudflarestorage.com"
            class="w-full px-3.5 py-2 text-sm font-mono border border-zinc-200 rounded-lg focus:border-zinc-900"
          />
        </div>

        <div>
          <label for="s3AccessKeyId" class="block text-xs font-semibold text-zinc-700 mb-1.5">
            Access Key ID
          </label>
          <input
            id="s3AccessKeyId"
            type="text"
            bind:value={s3Config.accessKeyId}
            placeholder="输入 Access Key ID"
            class="w-full px-3.5 py-2 text-sm font-mono border border-zinc-200 rounded-lg focus:border-zinc-900"
          />
        </div>

        <div>
          <label for="s3SecretAccessKey" class="block text-xs font-semibold text-zinc-700 mb-1.5">
            Secret Access Key
          </label>
          <div class="relative">
            {#if showSecretKey}
              <input
                id="s3SecretAccessKey"
                type="text"
                bind:value={s3Config.secretAccessKey}
                placeholder="输入 Secret Access Key"
                class="w-full px-3.5 py-2 text-sm font-mono border border-zinc-200 rounded-lg focus:border-zinc-900 pr-10"
              />
            {:else}
              <input
                id="s3SecretAccessKey"
                type="password"
                bind:value={s3Config.secretAccessKey}
                placeholder="输入 Secret Access Key"
                class="w-full px-3.5 py-2 text-sm font-mono border border-zinc-200 rounded-lg focus:border-zinc-900 pr-10"
              />
            {/if}
            <button
              type="button"
              on:click={() => (showSecretKey = !showSecretKey)}
              class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
            >
              {#if showSecretKey}
                <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clip-rule="evenodd" />
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                </svg>
              {:else}
                <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                </svg>
              {/if}
            </button>
          </div>
        </div>

        <div>
          <label for="s3Bucket" class="block text-xs font-semibold text-zinc-700 mb-1.5">
            Bucket 存储桶名称
          </label>
          <input
            id="s3Bucket"
            type="text"
            bind:value={s3Config.bucket}
            placeholder="例如: my-blog-images"
            class="w-full px-3.5 py-2 text-sm font-mono border border-zinc-200 rounded-lg focus:border-zinc-900"
          />
        </div>

        <div>
          <label for="s3PublicUrl" class="block text-xs font-semibold text-zinc-700 mb-1.5">
            公开访问 URL (CDN 域名)
          </label>
          <input
            id="s3PublicUrl"
            type="text"
            bind:value={s3Config.publicUrl}
            placeholder="例如: https://cdn.example.com"
            class="w-full px-3.5 py-2 text-sm font-mono border border-zinc-200 rounded-lg focus:border-zinc-900"
          />
        </div>

        <div>
          <label for="s3PathPrefix" class="block text-xs font-semibold text-zinc-700 mb-1.5">
            路径前缀 (可选)
          </label>
          <input
            id="s3PathPrefix"
            type="text"
            bind:value={s3Config.pathPrefix}
            placeholder="例如: blog/images"
            class="w-full px-3.5 py-2 text-sm font-mono border border-zinc-200 rounded-lg focus:border-zinc-900"
          />
        </div>

        <div>
          <label for="s3UrlSuffix" class="block text-xs font-semibold text-zinc-700 mb-1.5">
            URL 后缀 (可选，用于 CDN 图片样式)
          </label>
          <input
            id="s3UrlSuffix"
            type="text"
            bind:value={s3Config.urlSuffix}
            placeholder="例如: -ys"
            class="w-full px-3.5 py-2 text-sm font-mono border border-zinc-200 rounded-lg focus:border-zinc-900"
          />
        </div>

        <div class="flex items-center gap-2 pt-1">
          <input
            id="s3ForcePathStyle"
            type="checkbox"
            bind:checked={s3Config.forcePathStyle}
            class="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
          />
          <label for="s3ForcePathStyle" class="text-xs text-zinc-700 font-medium cursor-pointer">
            使用路径风格 (Path Style - Cloudflare R2 / MinIO 需勾选)
          </label>
        </div>

        <div class="pt-3 flex gap-3">
          <button
            on:click={handleSaveS3Config}
            disabled={s3Loading}
            class="flex-1 bg-zinc-900 hover:bg-black text-white text-xs font-semibold py-2.5 px-4 rounded-lg transition shadow-sm active:scale-[0.99] disabled:opacity-50"
          >
            {s3Loading ? '保存中...' : '保存 S3 图床配置'}
          </button>
          {#if $auth.s3Config}
            <button
              on:click={handleClearS3Config}
              class="px-4 py-2.5 border border-zinc-300 text-zinc-600 hover:text-red-600 hover:border-red-300 text-xs font-medium rounded-lg transition"
            >
              清除配置
            </button>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- 3. 配置导入与导出 -->
  <div class="bg-white rounded-2xl border border-zinc-200/80 p-6 sm:p-8 shadow-sm">
    <div class="flex items-center gap-2.5 mb-2">
      <div class="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center text-white">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
      </div>
      <h2 class="text-lg font-bold text-zinc-900">配置备份与同步</h2>
    </div>
    <p class="text-xs text-zinc-500 mb-6">
      一键导出或导入所有仓库与图床配置，方便在手机与电脑浏览器间快速同步
    </p>

    {#if importExportError}
      <div class="bg-zinc-50 border border-red-200 text-red-600 text-xs px-4 py-3 rounded-lg mb-4">
        {importExportError}
      </div>
    {/if}

    {#if importExportSuccess}
      <div class="bg-zinc-50 border border-emerald-200 text-emerald-700 text-xs px-4 py-3 rounded-lg mb-4">
        {importExportSuccess}
      </div>
    {/if}

    <div class="flex gap-3">
      <button
        on:click={handleExportConfig}
        class="flex-1 bg-zinc-900 hover:bg-black text-white text-xs font-semibold py-2.5 px-4 rounded-lg transition shadow-sm flex items-center justify-center gap-1.5 active:scale-[0.99]"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        <span>复制导出配置</span>
      </button>
      <button
        on:click={handleOpenImportModal}
        class="flex-1 bg-white border border-zinc-300 text-zinc-800 hover:bg-zinc-50 text-xs font-semibold py-2.5 px-4 rounded-lg transition flex items-center justify-center gap-1.5 active:scale-[0.99]"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l4 4m-4-4h12" />
        </svg>
        <span>导入已有配置</span>
      </button>
    </div>
  </div>

  <!-- 导入配置 Modal -->
  {#if showImportModal}
    <div class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div class="bg-white rounded-2xl shadow-xl border border-zinc-200 p-6 max-w-md w-full mx-auto animate-slide-up">
        <h3 class="text-base font-bold text-zinc-900 mb-1.5">导入配置字符串</h3>
        <p class="text-xs text-zinc-500 mb-4">
          粘贴从其他设备导出的 Base64 配置串，导入将覆盖当前的仓库与图床设置。
        </p>

        <textarea
          bind:value={importConfigText}
          placeholder="在此粘贴导出的配置字符串..."
          rows="4"
          class="w-full px-3.5 py-2.5 border border-zinc-200 rounded-lg text-xs font-mono mb-4 focus:border-zinc-900"
        ></textarea>

        <div class="flex items-center justify-end gap-2.5">
          <button
            on:click={handleCloseImportModal}
            class="px-4 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition"
          >
            取消
          </button>
          <button
            on:click={handleImportConfig}
            class="px-4 py-2 text-xs font-semibold bg-zinc-900 text-white hover:bg-black rounded-lg transition shadow-sm active:scale-95"
          >
            确认导入
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
