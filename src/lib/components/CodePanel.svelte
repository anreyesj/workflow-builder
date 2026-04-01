<script lang="ts">
  import { specYaml, specJson, workflowSpec } from '$lib/stores/workflow';

  type ViewFormat = 'yaml' | 'json';
  let format = $state<ViewFormat>('yaml');

  // For "load from text" feature
  let showImportModal = $state(false);
  let importText = $state('');
  let importError = $state('');

  // Copy feedback
  let copyMessage = $state('');

  function openImport() {
    importText = format === 'yaml' ? $specYaml : $specJson;
    importError = '';
    showImportModal = true;
  }

  function confirmImport() {
    const result = workflowSpec.loadFromText(importText);
    if (result.ok) {
      showImportModal = false;
    } else {
      importError = result.error ?? 'Unknown parse error';
    }
  }

  function copyToClipboard() {
    const text = format === 'yaml' ? $specYaml : $specJson;
    navigator.clipboard.writeText(text).then(
      () => {
        copyMessage = 'Copied!';
        setTimeout(() => (copyMessage = ''), 2000);
      },
      () => {
        copyMessage = 'Copy failed';
        setTimeout(() => (copyMessage = ''), 3000);
      }
    );
  }

  let code = $derived(format === 'yaml' ? $specYaml : $specJson);
</script>

<section class="code-panel">
  <!-- Toolbar -->
  <header class="code-toolbar">
    <div class="tab-group" role="tablist" aria-label="Output format">
      <button
        class="tab-btn"
        class:active={format === 'yaml'}
        role="tab"
        aria-selected={format === 'yaml'}
        onclick={() => (format = 'yaml')}
      >YAML</button>
      <button
        class="tab-btn"
        class:active={format === 'json'}
        role="tab"
        aria-selected={format === 'json'}
        onclick={() => (format = 'json')}
      >JSON</button>
    </div>

    <div class="toolbar-actions">
      <button class="action-btn" title="Edit / Import spec" onclick={openImport}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M11.5 2.5l2 2L5 13H3v-2L11.5 2.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
        </svg>
        Edit
      </button>
      <button class="action-btn" title="Copy to clipboard" onclick={copyToClipboard}>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="5" y="5" width="9" height="10" rx="1" stroke="currentColor" stroke-width="1.5"/>
          <path d="M3 11V3a1 1 0 011-1h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        {copyMessage || 'Copy'}
      </button>
    </div>
  </header>

  <!-- File path display -->
  <div class="file-path">
    <span class="file-icon">📄</span>
    <span class="file-name">arazzo.{format}</span>
  </div>

  <!-- Code view -->
  <div class="code-scroll">
    <pre class="code-block" aria-label="Arazzo specification in {format.toUpperCase()} format"><code>{code}</code></pre>
  </div>

  <!-- Import modal -->
  {#if showImportModal}
    <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit Arazzo spec">
      <div class="modal">
        <h3 class="modal-title">Edit Arazzo Spec</h3>
        <p class="modal-hint">Paste or edit your Arazzo spec (YAML or JSON).</p>
        {#if importError}
          <p class="error-message">{importError}</p>
        {/if}
        <textarea
          class="import-textarea"
          bind:value={importText}
          spellcheck="false"
          aria-label="Arazzo spec text"
        ></textarea>
        <div class="modal-actions">
          <button class="btn btn--secondary" onclick={() => (showImportModal = false)}>Cancel</button>
          <button class="btn btn--primary" onclick={confirmImport}>Load</button>
        </div>
      </div>
    </div>
  {/if}
</section>

<style>
  .code-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-bg-code);
    overflow: hidden;
  }

  /* Toolbar */
  .code-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-header);
    flex-shrink: 0;
  }

  .tab-group {
    display: flex;
    gap: 0.25rem;
  }

  .tab-btn {
    padding: 0.25rem 0.7rem;
    font-size: 0.78rem;
    font-weight: 500;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.15s;
  }

  .tab-btn.active {
    background: var(--color-accent);
    color: #fff;
    border-color: var(--color-accent);
  }

  .toolbar-actions {
    display: flex;
    gap: 0.5rem;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.25rem 0.6rem;
    font-size: 0.75rem;
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.15s;
  }

  .action-btn:hover {
    background: var(--color-bg-input);
    color: var(--color-text-primary);
  }

  /* File path */
  .file-path {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.35rem 1rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-code);
    font-size: 0.75rem;
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  .file-icon {
    font-size: 0.85rem;
  }

  .file-name {
    font-family: var(--font-mono);
  }

  /* Code block */
  .code-scroll {
    flex: 1;
    overflow: auto;
    padding: 1rem;
  }

  .code-block {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.82rem;
    line-height: 1.6;
    color: var(--color-code-text);
    white-space: pre;
    tab-size: 2;
  }

  /* Import modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .modal {
    background: var(--color-bg-panel);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 1.25rem;
    width: 42rem;
    max-width: 90vw;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .modal-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
  }

  .modal-hint {
    font-size: 0.78rem;
    color: var(--color-text-muted);
    margin: 0;
  }

  .error-message {
    font-size: 0.78rem;
    color: var(--color-danger);
    background: #fef2f2;
    border: 1px solid #fecaca;
    padding: 0.4rem 0.6rem;
    border-radius: 4px;
    margin: 0;
  }

  .import-textarea {
    width: 100%;
    height: 20rem;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    padding: 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg-code);
    color: var(--color-code-text);
    resize: vertical;
    box-sizing: border-box;
  }

  .import-textarea:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .modal-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .btn {
    padding: 0.35rem 0.85rem;
    font-size: 0.8rem;
    font-weight: 500;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: background 0.15s;
  }

  .btn--primary {
    background: var(--color-accent);
    color: #fff;
    border-color: var(--color-accent);
  }

  .btn--primary:hover {
    background: var(--color-accent-dark);
  }

  .btn--secondary {
    background: var(--color-bg-input);
    color: var(--color-text-primary);
    border-color: var(--color-border);
  }
</style>
