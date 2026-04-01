<script lang="ts">
  import ToolsPanel from '$lib/components/ToolsPanel.svelte';
  import CodePanel from '$lib/components/CodePanel.svelte';

  let toolsWidth = $state(340);
  const MIN_WIDTH = 240;
  const MAX_WIDTH = 520;

  function onResizerKeydown(e: KeyboardEvent) {
    const step = e.shiftKey ? 40 : 10;
    if (e.key === 'ArrowLeft') {
      toolsWidth = Math.max(MIN_WIDTH, toolsWidth - step);
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      toolsWidth = Math.min(MAX_WIDTH, toolsWidth + step);
      e.preventDefault();
    }
  }

  function onResizerPointerdown(e: PointerEvent) {
    const startX = e.clientX;
    const startWidth = toolsWidth;

    function onMove(ev: PointerEvent) {
      toolsWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + ev.clientX - startX));
    }

    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }
</script>

<div class="app-layout">
  <div class="pane pane--tools" style="width: {toolsWidth}px;">
    <ToolsPanel />
  </div>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="resizer"
    role="separator"
    aria-orientation="vertical"
    aria-valuenow={toolsWidth}
    aria-valuemin={MIN_WIDTH}
    aria-valuemax={MAX_WIDTH}
    aria-label="Resize panels (left/right arrow keys)"
    tabindex="0"
    onkeydown={onResizerKeydown}
    onpointerdown={onResizerPointerdown}
  ></div>
  <div class="pane pane--code">
    <CodePanel />
  </div>
</div>

<style>
  .app-layout {
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  .pane--tools {
    min-width: 240px;
    max-width: 520px;
    flex-shrink: 0;
    overflow: hidden;
  }

  .resizer {
    width: 4px;
    background: var(--color-border);
    cursor: col-resize;
    flex-shrink: 0;
    transition: background 0.15s;
  }

  .resizer:hover,
  .resizer:focus {
    background: var(--color-accent);
    outline: none;
  }

  .pane--code {
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }
</style>
