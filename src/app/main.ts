import './app.css';
import App from './App.svelte';
import { registerServiceWorker } from '$lib/pwa';

const target = document.getElementById('app');
if (!target) {
  throw new Error('App container element #app not found');
}

const app = new App({
  target,
});

// 注册 Service Worker 实现 PWA 自动更新
registerServiceWorker();

export default app;
