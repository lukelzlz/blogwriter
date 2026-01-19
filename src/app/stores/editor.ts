import { writable, derived, get } from 'svelte/store';
import type { Post } from '$shared/types';

interface EditorState {
  currentPost: Post | null;
  title: string;
  content: string;
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  originalDate: string | null; // 保存原始日期，编辑时保留
}

function createEditorStore() {
  const { subscribe, set, update } = writable<EditorState>({
    currentPost: null,
    title: '',
    content: '',
    isDirty: false,
    isSaving: false,
    lastSavedAt: null,
    originalDate: null,
  });

  // 创建一个可读的 store 用于 derived
  const editorStore = { subscribe };

  // 设置当前编辑的文章
  function setCurrentPost(post: Post | null) {
    update((state) => ({
      ...state,
      currentPost: post,
      title: post?.frontMatter?.title || '',
      content: post?.content || '',
      isDirty: false,
      lastSavedAt: null,
      originalDate: post?.frontMatter?.date || null,
    }));
  }

  // 更新标题
  function setTitle(title: string) {
    update((state) => ({
      ...state,
      title,
      isDirty: true,
    }));
  }

  // 更新内容
  function setContent(content: string) {
    update((state) => ({
      ...state,
      content,
      isDirty: true,
    }));
  }

  // 标记为已保存
  function markAsSaved() {
    update((state) => ({
      ...state,
      isDirty: false,
      isSaving: false,
      lastSavedAt: new Date(),
    }));
  }

  // 设置保存状态
  function setSaving(isSaving: boolean) {
    update((state) => ({
      ...state,
      isSaving,
    }));
  }

  // 重置编辑器
  function reset() {
    set({
      currentPost: null,
      title: '',
      content: '',
      isDirty: false,
      isSaving: false,
      lastSavedAt: null,
      originalDate: null,
    });
  }

  // 自动保存到 localStorage
  function saveToLocal() {
    update((state) => {
      const draftKey = `draft:${state.currentPost?.path || 'new'}`;
      localStorage.setItem(draftKey, JSON.stringify({
        title: state.title,
        content: state.content,
        timestamp: Date.now(),
      }));
      return state;
    });
  }

  // 从 localStorage 恢复草稿
  function loadFromLocal(path: string): { title: string; content: string } | null {
    const draftKey = `draft:${path}`;
    const draftData = localStorage.getItem(draftKey);
    
    if (draftData) {
      const draft = JSON.parse(draftData);
      return {
        title: draft.title,
        content: draft.content,
      };
    }
    
    return null;
  }

  // 清除本地草稿
  function clearLocalDraft(path: string) {
    const draftKey = `draft:${path}`;
    localStorage.removeItem(draftKey);
  }

  // 检查是否有本地草稿
  function hasLocalDraft(path: string): boolean {
    const draftKey = `draft:${path}`;
    return localStorage.getItem(draftKey) !== null;
  }

  // 派生属性：完整内容（包含 front-matter）
  const fullContent = derived(
    editorStore,
    ($state) => {
      const { title, content, originalDate } = $state;
      if (!title) return content;

      // 如果有原始日期，使用原始日期；否则使用当前时间
      const dateStr = originalDate || new Date().toISOString().replace('T', ' ').substring(0, 19);

      return `---
title: ${title}
date: ${dateStr}
---

${content}`;
    }
  );

  return {
    subscribe,
    setCurrentPost,
    setTitle,
    setContent,
    markAsSaved,
    setSaving,
    reset,
    saveToLocal,
    loadFromLocal,
    clearLocalDraft,
    hasLocalDraft,
    fullContent,
  };
}

export const editor = createEditorStore();
