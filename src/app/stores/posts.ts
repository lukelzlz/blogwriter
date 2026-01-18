import { writable } from 'svelte/store';
import type { Post } from '$shared/types';

interface PostsState {
  posts: Post[];
  loading: boolean;
  error: string | null;
}

function createPostsStore() {
  const { subscribe, set, update } = writable<PostsState>({
    posts: [],
    loading: false,
    error: null,
  });

  function setLoading(loading: boolean) {
    update((state) => ({ ...state, loading }));
  }

  function setError(error: string | null) {
    update((state) => ({ ...state, error }));
  }

  function setPosts(posts: Post[]) {
    update((state) => ({ ...state, posts, loading: false, error: null }));
  }

  function addPost(post: Post) {
    update((state) => ({
      ...state,
      posts: [post, ...state.posts],
    }));
  }

  function updatePost(path: string, updatedPost: Partial<Post>) {
    update((state) => ({
      ...state,
      posts: state.posts.map((p) =>
        p.path === path ? { ...p, ...updatedPost } : p
      ),
    }));
  }

  function removePost(path: string) {
    update((state) => ({
      ...state,
      posts: state.posts.filter((p) => p.path !== path),
    }));
  }

  return {
    subscribe,
    setLoading,
    setError,
    setPosts,
    addPost,
    updatePost,
    removePost,
  };
}

export const posts = createPostsStore();
