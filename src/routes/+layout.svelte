<script lang="ts">
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
  <title>Workflow Builder</title>
  <meta name="description" content="Visual Arazzo specification builder for API workflows" />
</svelte:head>

{@render children()}
