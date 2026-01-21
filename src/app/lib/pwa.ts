/**
 * PWA 自动更新管理模块
 */

import { writable } from 'svelte/store';

// 更新状态 store
export const updateAvailable = writable(false);
export const updateError = writable<string | null>(null);

let registration: ServiceWorkerRegistration | null = null;
let refreshing = false;

/**
 * 注册 Service Worker 并设置自动更新
 */
export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.log('📱 [PWA] Service Worker 不受支持');
    return;
  }

  try {
    // 使用 vite-plugin-pwa 生成的 SW
    registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('✅ [PWA] Service Worker 注册成功');

    // 检查更新
    registration.addEventListener('updatefound', () => {
      const newWorker = registration?.installing;
      if (!newWorker) return;

      console.log('🔄 [PWA] 发现新版本，正在下载...');

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // 新版本已安装，等待激活
          console.log('📦 [PWA] 新版本已下载，可以更新');
          updateAvailable.set(true);
        }
      });
    });

    // 定期检查更新（每5分钟）
    setInterval(() => {
      checkForUpdates();
    }, 5 * 60 * 1000);

    // 页面可见时检查更新
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    });

    // 监听 controller 变化，自动刷新页面
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      console.log('🔄 [PWA] Service Worker 已更新，刷新页面...');
      window.location.reload();
    });

  } catch (error) {
    console.error('❌ [PWA] Service Worker 注册失败:', error);
    updateError.set(error instanceof Error ? error.message : '注册失败');
  }
}

/**
 * 手动检查更新
 */
export async function checkForUpdates(): Promise<void> {
  if (!registration) {
    console.log('⚠️ [PWA] Service Worker 未注册');
    return;
  }

  try {
    console.log('🔍 [PWA] 检查更新...');
    await registration.update();
  } catch (error) {
    console.error('❌ [PWA] 检查更新失败:', error);
  }
}

/**
 * 应用更新（跳过等待，立即激活新版本）
 */
export function applyUpdate(): void {
  if (!registration?.waiting) {
    console.log('⚠️ [PWA] 没有等待中的更新');
    return;
  }

  console.log('🚀 [PWA] 应用更新...');
  
  // 通知 waiting 的 SW 跳过等待
  registration.waiting.postMessage({ type: 'SKIP_WAITING' });
  
  updateAvailable.set(false);
}

/**
 * 获取当前 SW 注册信息
 */
export function getRegistration(): ServiceWorkerRegistration | null {
  return registration;
}
