<script lang="ts">
  import { allOperations, sourceSpecs } from '$lib/stores/sourceSpecs';
  import { workflowSpec } from '$lib/stores/workflow';
  import type { ParsedOperation } from '$lib/types/arazzo';

  interface Props {
    /** Current operationId (e.g. "petstore.getPetById") */
    currentOperationId?: string;
    /** Current operationPath */
    currentOperationPath?: string;
    /** Called when user picks a new operation */
    onSelect: (op: { operationId?: string; operationPath?: string; operation: ParsedOperation; sourceName: string }) => void;
  }

  let { currentOperationId, currentOperationPath, onSelect }: Props = $props();

  let expanded = $state(false);
  let filterText = $state('');

  let operations = $derived($allOperations);
  let specs = $derived($sourceSpecs);

  let filtered = $derived(
    filterText.trim()
      ? operations.filter(({ sourceName, operation: op }) => {
          const q = filterText.toLowerCase();
          return (
            op.operationId.toLowerCase().includes(q) ||
            op.path.toLowerCase().includes(q) ||
            (op.summary ?? '').toLowerCase().includes(q) ||
            sourceName.toLowerCase().includes(q)
          );
        })
      : operations
  );

  function pickOperation(sourceName: string, op: ParsedOperation) {
    onSelect({
      operationId: `${sourceName}.${op.operationId}`,
      operationPath: undefined,
      operation: op,
      sourceName
    });
    expanded = false;
    filterText = '';
  }

  let currentDisplay = $derived(
    currentOperationId || currentOperationPath || 'Select an operation…'
  );

  let hasAnySources = $derived(Object.keys(specs.specs).length > 0);
  let hasLoadingSource = $derived(
    Object.values(specs.specs).some((s) => s.status === 'loading')
  );
</script>

<div class="op-picker">
  <button
    class="op-picker-trigger"
    class:has-value={!!currentOperationId || !!currentOperationPath}
    onclick={() => (expanded = !expanded)}
    title={currentDisplay}
  >
    <span class="op-picker-label">{currentDisplay}</span>
    <span class="op-picker-arrow">{expanded ? '▲' : '▼'}</span>
  </button>

  {#if expanded}
    <div class="op-picker-dropdown">
      {#if !hasAnySources}
        <div class="op-picker-empty">
          No source specs loaded. Add an API source and click "Fetch & Load" to browse operations.
        </div>
      {:else}
        <input
          class="op-picker-search"
          type="text"
          placeholder="Filter operations…"
          bind:value={filterText}
        />
        {#if hasLoadingSource}
          <div class="op-picker-loading">Loading specs…</div>
        {/if}
        {#if filtered.length === 0}
          <div class="op-picker-empty">No matching operations.</div>
        {/if}
        <div class="op-picker-list">
          {#each filtered as { sourceName, operation: op }}
            <button
              class="op-picker-item"
              class:active={currentOperationId === `${sourceName}.${op.operationId}`}
              onclick={() => pickOperation(sourceName, op)}
            >
              <span class="op-method op-method--{op.method.toLowerCase()}">{op.method}</span>
              <span class="op-path">{op.path}</span>
              <span class="op-id">{sourceName}.{op.operationId}</span>
              {#if op.summary}
                <span class="op-summary">{op.summary}</span>
              {/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .op-picker {
    position: relative;
  }

  .op-picker-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.35rem 0.5rem;
    font-size: 0.78rem;
    background: var(--color-bg-input);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text-secondary);
    cursor: pointer;
    text-align: left;
    font-family: var(--font-mono);
  }

  .op-picker-trigger.has-value {
    color: var(--color-accent-light);
  }

  .op-picker-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .op-picker-arrow {
    font-size: 0.6rem;
    margin-left: 0.4rem;
    flex-shrink: 0;
  }

  .op-picker-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 50;
    background: var(--color-bg-panel);
    border: 1px solid var(--color-border);
    border-radius: 0 0 6px 6px;
    max-height: 18rem;
    display: flex;
    flex-direction: column;
  }

  .op-picker-search {
    padding: 0.35rem 0.5rem;
    font-size: 0.78rem;
    background: var(--color-bg-input);
    border: none;
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text-primary);
    outline: none;
  }

  .op-picker-list {
    overflow-y: auto;
    max-height: 15rem;
  }

  .op-picker-item {
    width: 100%;
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
    gap: 0 0.4rem;
    padding: 0.4rem 0.5rem;
    background: none;
    border: none;
    border-bottom: 1px solid var(--color-border);
    cursor: pointer;
    text-align: left;
    color: var(--color-text-primary);
    transition: background 0.1s;
  }

  .op-picker-item:hover {
    background: var(--color-bg-selected);
  }

  .op-picker-item.active {
    background: var(--color-bg-selected);
    border-left: 2px solid var(--color-accent);
  }

  .op-method {
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.1rem 0.3rem;
    border-radius: 3px;
    text-transform: uppercase;
    align-self: center;
  }

  .op-method--get { background: #064e3b; color: #6ee7b7; }
  .op-method--post { background: #1e3a5f; color: #7dd3fc; }
  .op-method--put { background: #713f12; color: #fde68a; }
  .op-method--patch { background: #713f12; color: #fde68a; }
  .op-method--delete { background: #7f1d1d; color: #fca5a5; }

  .op-path {
    font-size: 0.78rem;
    font-family: var(--font-mono);
    color: var(--color-text-primary);
    align-self: center;
  }

  .op-id {
    grid-column: 1 / -1;
    font-size: 0.68rem;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  .op-summary {
    grid-column: 1 / -1;
    font-size: 0.68rem;
    color: var(--color-text-secondary);
  }

  .op-picker-empty,
  .op-picker-loading {
    padding: 0.6rem 0.5rem;
    font-size: 0.75rem;
    color: var(--color-text-muted);
    font-style: italic;
  }
</style>
