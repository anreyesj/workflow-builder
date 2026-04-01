<script lang="ts">
  import { workflowSpec, selectedWorkflowIndex, selectedStepIndex } from '$lib/stores/workflow';
  import { sourceSpecs, allOperations } from '$lib/stores/sourceSpecs';
  import type { Step, ParsedOperation } from '$lib/types/arazzo';
  import OperationPicker from './OperationPicker.svelte';
  import ParameterMapper from './ParameterMapper.svelte';
  import WorkflowInputsEditor from './WorkflowInputsEditor.svelte';

  // ---- Source modal state ----
  let showAddSourceModal = $state(false);
  let newSourceName = $state('');
  let newSourceUrl = $state('');
  let newSourceType = $state<'openapi' | 'arazzo'>('openapi');

  function openAddSource() {
    newSourceName = '';
    newSourceUrl = '';
    newSourceType = 'openapi';
    showAddSourceModal = true;
  }

  function confirmAddSource() {
    if (newSourceName.trim() && newSourceUrl.trim()) {
      workflowSpec.addSource(newSourceName.trim(), newSourceUrl.trim(), newSourceType);
    }
    showAddSourceModal = false;
  }

  function fetchSource(name: string, url: string) {
    sourceSpecs.fetchSpec(name, url);
  }

  function removeSource(index: number) {
    const src = spec.sourceDescriptions[index];
    if (src) sourceSpecs.removeSpec(src.name);
    workflowSpec.removeSource(index);
  }

  // ---- Derived reactive values ----
  let spec = $derived($workflowSpec);
  let workflows = $derived(spec.workflows);
  let selectedWf = $derived(workflows[$selectedWorkflowIndex] ?? workflows[0]);
  let specStates = $derived($sourceSpecs);
  let operations = $derived($allOperations);

  // Track which operation each step is bound to (resolved from loaded specs)
  function findResolvedOperation(step: Step): ParsedOperation | undefined {
    if (!step.operationId) return undefined;
    // operationId format: "sourceName.operationId"
    const dotIdx = step.operationId.indexOf('.');
    if (dotIdx < 0) return undefined;
    const srcName = step.operationId.slice(0, dotIdx);
    const opId = step.operationId.slice(dotIdx + 1);
    return operations.find((o) => o.sourceName === srcName && o.operation.operationId === opId)?.operation;
  }

  function selectWorkflow(index: number) {
    selectedWorkflowIndex.set(index);
    selectedStepIndex.set(-1);
  }

  function removeSelectedWorkflow() {
    workflowSpec.removeWorkflow($selectedWorkflowIndex);
    selectedWorkflowIndex.set(0);
  }
</script>

<aside class="tools-panel">
  <!-- ── Header ── -->
  <header class="panel-header">
    <h1 class="app-title">Workflow Builder</h1>
    <p class="app-subtitle">Arazzo Spec Editor</p>
  </header>

  <!-- ── Info ── -->
  <section class="section">
    <h2 class="section-title">Spec Info</h2>
    <div class="field-group">
      <label class="field-label" for="spec-title">Title</label>
      <input
        id="spec-title"
        class="field-input"
        type="text"
        value={spec.info.title}
        oninput={(e) => workflowSpec.updateInfo({ title: (e.target as HTMLInputElement).value })}
      />
    </div>
    <div class="field-group">
      <label class="field-label" for="spec-version">Version</label>
      <input
        id="spec-version"
        class="field-input"
        type="text"
        value={spec.info.version}
        oninput={(e) => workflowSpec.updateInfo({ version: (e.target as HTMLInputElement).value })}
      />
    </div>
    <div class="field-group">
      <label class="field-label" for="spec-description">Description</label>
      <textarea
        id="spec-description"
        class="field-input field-textarea"
        value={spec.info.description ?? ''}
        oninput={(e) => workflowSpec.updateInfo({ description: (e.target as HTMLTextAreaElement).value })}
      ></textarea>
    </div>
  </section>

  <!-- ── Sources ── -->
  <section class="section">
    <div class="section-header-row">
      <h2 class="section-title">API Sources</h2>
      <button class="btn-icon" title="Add source" onclick={openAddSource}>＋</button>
    </div>
    {#if spec.sourceDescriptions.length === 0}
      <p class="empty-hint">No sources yet. Add an OpenAPI spec URL.</p>
    {/if}
    {#each spec.sourceDescriptions as src, i}
      {@const state = specStates.specs[src.name]}
      <div class="source-item">
        <div class="source-meta">
          <span class="badge badge--{src.type}">{src.type}</span>
          <span class="source-name">{src.name}</span>
          {#if state?.status === 'loaded'}
            <span class="badge badge--loaded" title="Spec loaded — {state.spec?.operations.length ?? 0} operations">✓ {state.spec?.operations.length ?? 0} ops</span>
          {:else if state?.status === 'loading'}
            <span class="badge badge--loading">loading…</span>
          {:else if state?.status === 'error'}
            <span class="badge badge--error" title={state.error}>✕ error</span>
          {/if}
        </div>
        <span class="source-url" title={src.url}>{src.url}</span>
        <div class="source-actions">
          <button
            class="btn btn--small"
            title="Fetch and parse this OpenAPI spec"
            onclick={() => fetchSource(src.name, src.url)}
          >Fetch & Load</button>
          <button
            class="btn-remove"
            title="Remove source"
            onclick={() => removeSource(i)}
          >✕</button>
        </div>
      </div>
    {/each}

    <!-- Add source modal -->
    {#if showAddSourceModal}
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Add API source">
        <div class="modal">
          <h3 class="modal-title">Add API Source</h3>
          <label class="field-label" for="src-name">Name</label>
          <input id="src-name" class="field-input" type="text" placeholder="petstore" bind:value={newSourceName} />
          <label class="field-label" for="src-url">URL</label>
          <input id="src-url" class="field-input" type="url" placeholder="https://..." bind:value={newSourceUrl} />
          <label class="field-label" for="src-type">Type</label>
          <select id="src-type" class="field-input" bind:value={newSourceType}>
            <option value="openapi">OpenAPI</option>
            <option value="arazzo">Arazzo</option>
          </select>
          <div class="modal-actions">
            <button class="btn btn--secondary" onclick={() => (showAddSourceModal = false)}>Cancel</button>
            <button class="btn btn--primary" onclick={confirmAddSource}>Add</button>
          </div>
        </div>
      </div>
    {/if}
  </section>

  <!-- ── Workflows ── -->
  <section class="section">
    <div class="section-header-row">
      <h2 class="section-title">Workflows</h2>
      <button class="btn-icon" title="Add workflow" onclick={() => workflowSpec.addWorkflow()}>＋</button>
    </div>

    <!-- Workflow tabs -->
    <div class="workflow-tabs" role="tablist" aria-label="Workflows">
      {#each workflows as wf, i}
        <button
          class="workflow-tab"
          class:active={$selectedWorkflowIndex === i}
          role="tab"
          aria-selected={$selectedWorkflowIndex === i}
          onclick={() => selectWorkflow(i)}
        >{wf.workflowId}</button>
      {/each}
    </div>

    {#if selectedWf}
      <!-- Workflow fields -->
      <div class="field-group">
        <label class="field-label" for="wf-id">Workflow ID</label>
        <input
          id="wf-id"
          class="field-input"
          type="text"
          value={selectedWf.workflowId}
          oninput={(e) =>
            workflowSpec.updateWorkflow($selectedWorkflowIndex, {
              workflowId: (e.target as HTMLInputElement).value
            })}
        />
      </div>
      <div class="field-group">
        <label class="field-label" for="wf-summary">Summary</label>
        <input
          id="wf-summary"
          class="field-input"
          type="text"
          value={selectedWf.summary ?? ''}
          oninput={(e) =>
            workflowSpec.updateWorkflow($selectedWorkflowIndex, {
              summary: (e.target as HTMLInputElement).value
            })}
        />
      </div>
      <div class="field-group">
        <label class="field-label" for="wf-description">Description</label>
        <textarea
          id="wf-description"
          class="field-input field-textarea"
          value={selectedWf.description ?? ''}
          oninput={(e) =>
            workflowSpec.updateWorkflow($selectedWorkflowIndex, {
              description: (e.target as HTMLTextAreaElement).value
            })}
        ></textarea>
      </div>

      <!-- Workflow Inputs -->
      <div style="margin-top: 0.5rem;">
        <WorkflowInputsEditor
          inputs={selectedWf.inputs}
          onInputsChange={(inputs) => workflowSpec.updateWorkflowInputs($selectedWorkflowIndex, inputs)}
        />
      </div>

      <!-- Steps -->
      <div class="section-header-row" style="margin-top: 0.75rem;">
        <h3 class="subsection-title">Steps</h3>
        <button
          class="btn-icon"
          title="Add step"
          onclick={() => workflowSpec.addStep($selectedWorkflowIndex)}
        >＋</button>
      </div>

      {#if selectedWf.steps.length === 0}
        <p class="empty-hint">No steps. Click ＋ to add a step.</p>
      {/if}

      {#each selectedWf.steps as step, si}
        {@const resolvedOp = findResolvedOperation(step)}
        <div
          class="step-card"
          class:selected={$selectedStepIndex === si}
          role="button"
          tabindex="0"
          aria-label="Step {step.stepId}"
          onclick={() => selectedStepIndex.set(si)}
          onkeydown={(e) => e.key === 'Enter' && selectedStepIndex.set(si)}
        >
          <div class="step-header">
            <span class="step-index">{si + 1}</span>
            <span class="step-id">{step.stepId}</span>
            {#if resolvedOp}
              <span class="step-bound-badge" title="Bound to source operation">✓</span>
            {/if}
            <button
              class="btn-remove"
              title="Remove step"
              onclick={(e) => { e.stopPropagation(); workflowSpec.removeStep($selectedWorkflowIndex, si); }}
            >✕</button>
          </div>
          {#if step.description}
            <p class="step-desc">{step.description}</p>
          {/if}
          {#if step.operationId}
            <code class="step-op">{step.operationId}</code>
          {/if}
          {#if resolvedOp}
            <span class="step-method-badge">
              <span class="op-method-mini op-method-mini--{resolvedOp.method.toLowerCase()}">{resolvedOp.method}</span>
              {resolvedOp.path}
            </span>
          {/if}

          <!-- Expanded step editor when selected -->
          {#if $selectedStepIndex === si}
            <div class="step-editor">
              <label class="field-label" for="step-id-{si}">Step ID</label>
              <input
                id="step-id-{si}"
                class="field-input"
                type="text"
                value={step.stepId}
                oninput={(e) =>
                  workflowSpec.updateStep($selectedWorkflowIndex, si, {
                    stepId: (e.target as HTMLInputElement).value
                  })}
              />
              <label class="field-label" for="step-desc-{si}">Description</label>
              <textarea
                id="step-desc-{si}"
                class="field-input field-textarea-sm"
                value={step.description ?? ''}
                oninput={(e) =>
                  workflowSpec.updateStep($selectedWorkflowIndex, si, {
                    description: (e.target as HTMLTextAreaElement).value
                  })}
              ></textarea>

              <!-- Operation picker (replaces freetext operationId) -->
              <label class="field-label">Operation</label>
              <OperationPicker
                currentOperationId={step.operationId}
                currentOperationPath={step.operationPath}
                onSelect={({ operationId, operationPath, operation, sourceName }) => {
                  workflowSpec.updateStep($selectedWorkflowIndex, si, {
                    operationId,
                    operationPath
                  });
                }}
              />

              <!-- Fallback: manual operationId input if no specs loaded -->
              {#if operations.length === 0}
                <label class="field-label" for="step-op-{si}">Operation ID (manual)</label>
                <input
                  id="step-op-{si}"
                  class="field-input"
                  type="text"
                  value={step.operationId ?? ''}
                  placeholder="source.operationId"
                  oninput={(e) =>
                    workflowSpec.updateStep($selectedWorkflowIndex, si, {
                      operationId: (e.target as HTMLInputElement).value
                    })}
                />
              {/if}

              <!-- Parameter & Request Body Mapping -->
              <ParameterMapper
                operation={resolvedOp}
                parameters={step.parameters}
                requestBody={step.requestBody}
                workflowInputs={selectedWf.inputs}
                onParametersChange={(params) =>
                  workflowSpec.updateStep($selectedWorkflowIndex, si, { parameters: params })}
                onRequestBodyChange={(body) =>
                  workflowSpec.updateStep($selectedWorkflowIndex, si, { requestBody: body })}
              />

              <!-- Success Criteria -->
              {#if step.successCriteria && step.successCriteria.length > 0}
                <label class="field-label" for="step-criteria-{si}-0">Success Criteria</label>
                {#each step.successCriteria as criterion, ci}
                  <input
                    id="step-criteria-{si}-{ci}"
                    class="field-input"
                    type="text"
                    value={criterion.condition}
                    aria-label="Success criterion {ci + 1}"
                    oninput={(e) => {
                      const criteria = [...(step.successCriteria ?? [])];
                      criteria[ci] = { ...criteria[ci], condition: (e.target as HTMLInputElement).value };
                      workflowSpec.updateStep($selectedWorkflowIndex, si, { successCriteria: criteria });
                    }}
                  />
                {/each}
              {/if}

              <!-- Step Outputs -->
              <label class="field-label">Step Outputs</label>
              <div class="outputs-editor">
                {#each Object.entries(step.outputs ?? {}) as [key, value], oi}
                  <div class="output-row">
                    <input
                      class="field-input output-key"
                      type="text"
                      value={key}
                      placeholder="outputName"
                      oninput={(e) => {
                        const newKey = (e.target as HTMLInputElement).value;
                        const outputs = { ...(step.outputs ?? {}) };
                        const entries = Object.entries(outputs);
                        entries[oi] = [newKey, value];
                        workflowSpec.updateStep($selectedWorkflowIndex, si, { outputs: Object.fromEntries(entries) });
                      }}
                    />
                    <input
                      class="field-input output-value"
                      type="text"
                      value={value}
                      placeholder="$response.body#/field"
                      oninput={(e) => {
                        const outputs = { ...(step.outputs ?? {}) };
                        outputs[key] = (e.target as HTMLInputElement).value;
                        workflowSpec.updateStep($selectedWorkflowIndex, si, { outputs });
                      }}
                    />
                    <button
                      class="btn-remove"
                      onclick={() => {
                        const outputs = { ...(step.outputs ?? {}) };
                        delete outputs[key];
                        workflowSpec.updateStep($selectedWorkflowIndex, si, { outputs });
                      }}
                    >✕</button>
                  </div>
                {/each}
                <button
                  class="btn btn--small"
                  onclick={() => {
                    const outputs = { ...(step.outputs ?? {}), ['newOutput']: '$response.body' };
                    workflowSpec.updateStep($selectedWorkflowIndex, si, { outputs });
                  }}
                >+ Add Output</button>
              </div>
            </div>
          {/if}
        </div>
      {/each}

      <!-- Workflow Outputs -->
      {#if selectedWf.steps.length > 0}
        <div class="section-header-row" style="margin-top: 0.75rem;">
          <h3 class="subsection-title">Workflow Outputs</h3>
          <button
            class="btn-icon"
            title="Add output"
            onclick={() => {
              const outputs = { ...(selectedWf.outputs ?? {}), ['newOutput']: '$steps.stepId.outputs.value' };
              workflowSpec.updateWorkflowOutputs($selectedWorkflowIndex, outputs);
            }}
          >＋</button>
        </div>
        {#each Object.entries(selectedWf.outputs ?? {}) as [key, value], oi}
          <div class="output-row">
            <input
              class="field-input output-key"
              type="text"
              value={key}
              placeholder="outputName"
              oninput={(e) => {
                const newKey = (e.target as HTMLInputElement).value;
                const outputs = { ...(selectedWf.outputs ?? {}) };
                const entries = Object.entries(outputs);
                entries[oi] = [newKey, value];
                workflowSpec.updateWorkflowOutputs($selectedWorkflowIndex, Object.fromEntries(entries));
              }}
            />
            <input
              class="field-input output-value"
              type="text"
              value={value}
              placeholder="$steps.stepId.outputs.value"
              oninput={(e) => {
                const outputs = { ...(selectedWf.outputs ?? {}) };
                outputs[key] = (e.target as HTMLInputElement).value;
                workflowSpec.updateWorkflowOutputs($selectedWorkflowIndex, outputs);
              }}
            />
            <button
              class="btn-remove"
              onclick={() => {
                const outputs = { ...(selectedWf.outputs ?? {}) };
                delete outputs[key];
                workflowSpec.updateWorkflowOutputs($selectedWorkflowIndex, outputs);
              }}
            >✕</button>
          </div>
        {/each}
      {/if}

      <!-- Remove workflow -->
      {#if workflows.length > 1}
        <button
          class="btn btn--danger"
          style="margin-top: 0.75rem;"
          onclick={removeSelectedWorkflow}
        >Remove Workflow</button>
      {/if}
    {/if}
  </section>
</aside>

<style>
  .tools-panel {
    display: flex;
    flex-direction: column;
    gap: 0;
    height: 100%;
    overflow-y: auto;
    background: var(--color-bg-panel);
    border-right: 1px solid var(--color-border);
  }

  .panel-header {
    padding: 1rem 1.25rem 0.75rem;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-bg-header);
  }

  .app-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0;
  }

  .app-subtitle {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    margin: 0.15rem 0 0;
  }

  .section {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }

  .section-title {
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
    margin: 0 0 0.75rem;
  }

  .subsection-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    margin: 0;
  }

  .section-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }

  .field-group {
    margin-bottom: 0.6rem;
  }

  .field-label {
    display: block;
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    margin-bottom: 0.25rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .field-input {
    width: 100%;
    padding: 0.35rem 0.5rem;
    font-size: 0.82rem;
    background: var(--color-bg-input);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text-primary);
    box-sizing: border-box;
    transition: border-color 0.15s;
  }

  .field-input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .field-textarea {
    min-height: 4rem;
    resize: vertical;
    font-family: inherit;
  }

  .btn-icon {
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text-secondary);
    cursor: pointer;
    font-size: 0.95rem;
    line-height: 1;
    padding: 0.15rem 0.4rem;
    transition: background 0.15s, color 0.15s;
  }

  .btn-icon:hover {
    background: var(--color-accent);
    color: #fff;
    border-color: var(--color-accent);
  }

  .btn-remove {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-muted);
    font-size: 0.75rem;
    padding: 0.1rem 0.25rem;
    margin-left: auto;
    transition: color 0.15s;
  }

  .btn-remove:hover {
    color: var(--color-danger);
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
  }

  .btn--primary:hover {
    background: var(--color-accent-dark);
  }

  .btn--secondary {
    background: var(--color-bg-input);
    color: var(--color-text-primary);
    border-color: var(--color-border);
  }

  .btn--danger {
    background: none;
    color: var(--color-danger);
    border-color: var(--color-danger);
    font-size: 0.75rem;
    padding: 0.25rem 0.65rem;
  }

  .btn--danger:hover {
    background: var(--color-danger);
    color: #fff;
  }

  /* Source items */
  .source-item {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    margin-bottom: 0.4rem;
    background: var(--color-bg-card);
    position: relative;
  }

  .source-meta {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .badge {
    font-size: 0.65rem;
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .badge--openapi {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .badge--arazzo {
    background: #d1fae5;
    color: #065f46;
  }

  .source-name {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .source-url {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .source-item .btn-remove {
    position: absolute;
    top: 0.4rem;
    right: 0.4rem;
  }

  .source-actions {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    margin-top: 0.2rem;
  }

  .btn--small {
    padding: 0.2rem 0.5rem;
    font-size: 0.68rem;
    font-weight: 500;
    border-radius: 3px;
    cursor: pointer;
    border: 1px solid var(--color-accent);
    background: none;
    color: var(--color-accent-light);
    transition: all 0.15s;
  }

  .btn--small:hover {
    background: var(--color-accent);
    color: #fff;
  }

  .badge--loaded {
    background: #064e3b;
    color: #6ee7b7;
  }

  .badge--loading {
    background: #713f12;
    color: #fde68a;
  }

  .badge--error {
    background: #7f1d1d;
    color: #fca5a5;
  }

  /* Workflow tabs */
  .workflow-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-bottom: 0.75rem;
  }

  .workflow-tab {
    padding: 0.25rem 0.6rem;
    font-size: 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg-input);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.15s;
  }

  .workflow-tab.active {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: #fff;
  }

  /* Step cards */
  .step-card {
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.5rem 0.6rem;
    margin-bottom: 0.4rem;
    background: var(--color-bg-card);
    cursor: pointer;
    transition: border-color 0.15s, background 0.15s;
  }

  .step-card:hover {
    border-color: var(--color-accent-light);
  }

  .step-card.selected {
    border-color: var(--color-accent);
    background: var(--color-bg-selected);
  }

  .step-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .step-index {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.2rem;
    height: 1.2rem;
    border-radius: 50%;
    background: var(--color-accent);
    color: #fff;
    font-size: 0.65rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .step-id {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text-primary);
    flex: 1;
  }

  .step-desc {
    font-size: 0.72rem;
    color: var(--color-text-muted);
    margin: 0.25rem 0 0 1.7rem;
  }

  .step-op {
    display: block;
    font-size: 0.68rem;
    color: var(--color-accent);
    margin: 0.2rem 0 0 1.7rem;
    font-family: var(--font-mono);
  }

  .step-bound-badge {
    font-size: 0.6rem;
    color: #6ee7b7;
    background: #064e3b;
    padding: 0.05rem 0.25rem;
    border-radius: 3px;
    font-weight: 600;
  }

  .step-method-badge {
    display: block;
    font-size: 0.65rem;
    color: var(--color-text-secondary);
    margin: 0.15rem 0 0 1.7rem;
    font-family: var(--font-mono);
  }

  .op-method-mini {
    font-size: 0.58rem;
    font-weight: 700;
    padding: 0.05rem 0.2rem;
    border-radius: 2px;
    margin-right: 0.2rem;
  }

  .op-method-mini--get { background: #064e3b; color: #6ee7b7; }
  .op-method-mini--post { background: #1e3a5f; color: #7dd3fc; }
  .op-method-mini--put { background: #713f12; color: #fde68a; }
  .op-method-mini--patch { background: #713f12; color: #fde68a; }
  .op-method-mini--delete { background: #7f1d1d; color: #fca5a5; }

  .field-textarea-sm {
    min-height: 2.5rem;
    resize: vertical;
    font-family: inherit;
    font-size: 0.78rem;
  }

  /* Output editor */
  .outputs-editor {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .output-row {
    display: flex;
    gap: 0.25rem;
    align-items: center;
  }

  .output-key {
    flex: 0 0 35%;
    font-family: var(--font-mono);
    font-size: 0.72rem;
  }

  .output-value {
    flex: 1;
    font-family: var(--font-mono);
    font-size: 0.72rem;
  }

  .step-editor {
    margin-top: 0.6rem;
    padding-top: 0.6rem;
    border-top: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .empty-hint {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    font-style: italic;
    margin: 0 0 0.5rem;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
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
    width: 22rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .modal-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0 0 0.25rem;
  }

  .modal-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 0.25rem;
  }
</style>
