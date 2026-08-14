<script lang="ts">
  import { onMount } from 'svelte';

  export let navigate: (path: string) => void = () => {};

  onMount(() => {
    navigate('/');
  });
</script>

<div class="flex items-center justify-center min-h-[300px] text-gray-500">
  <span>正在跳转至首页...</span>
</div>
