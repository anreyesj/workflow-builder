<script lang="ts">
  import type { WorkflowInputs, JsonSchemaProperty } from '$lib/types/arazzo';

  interface Props {
    inputs?: WorkflowInputs;
    onInputsChange: (inputs: WorkflowInputs) => void;
  }

  let { inputs, onInputsChange }: Props = $props();

  let showAddField = $state(false);
  let newFieldName = $state('');
  let newFieldType = $state('string');
  let newFieldDesc = $state('');
  let newFieldRequired = $state(false);

  let properties = $derived(Object.entries(inputs?.properties ?? {}));
  let requiredFields = $derived(new Set(inputs?.required ?? []));

  function addField() {
    if (!newFieldName.trim()) return;
    const name = newFieldName.trim();
    const currentProps = { ...(inputs?.properties ?? {}) };
    const prop: JsonSchemaProperty = { type: newFieldType };
    if (newFieldDesc.trim()) prop.description = newFieldDesc.trim();
    currentProps[name] = prop;

    const currentRequired = [...(inputs?.required ?? [])];
    if (newFieldRequired && !currentRequired.includes(name)) {
      currentRequired.push(name);
    }

    onInputsChange({
      type: 'object',
      properties: currentProps,
      required: currentRequired.length > 0 ? currentRequired : undefined
    });

    newFieldName = '';
    newFieldType = 'string';
    newFieldDesc = '';
    newFieldRequired = false;
    showAddField = false;
  }

  function removeField(name: string) {
    const currentProps = { ...(inputs?.properties ?? {}) };
    delete currentProps[name];
    const currentRequired = (inputs?.required ?? []).filter((r) => r !== name);

    onInputsChange({
      type: 'object',
      properties: currentProps,
      required: currentRequired.length > 0 ? currentRequired : undefined
    });
  }

  function toggleRequired(name: string) {
    const currentRequired = [...(inputs?.required ?? [])];
    const idx = currentRequired.indexOf(name);
    if (idx >= 0) {
      currentRequired.splice(idx, 1);
    } else {
      currentRequired.push(name);
    }

    onInputsChange({
      ...inputs!,
      required: currentRequired.length > 0 ? currentRequired : undefined
    });
  }

  function updateFieldDesc(name: string, desc: string) {
    const currentProps = { ...(inputs?.properties ?? {}) };
    currentProps[name] = { ...currentProps[name], description: desc || undefined };
    onInputsChange({ ...inputs!, properties: currentProps });
  }
</script>

<div class="inputs-editor">
  <div class="inputs-header">
    <h4 class="inputs-title">Workflow Inputs</h4>
    <button class="btn-icon" title="Add input field" onclick={() => (showAddField = !showAddField)}>＋</button>
  </div>

  {#if properties.length === 0 && !showAddField}
    <p class="empty-hint">No inputs defined. Click ＋ to add input fields that steps can reference via $inputs.fieldName</p>
  {/if}

  {#each properties as [name, prop]}
    <div class="input-field" class:required={requiredFields.has(name)}>
      <div class="input-field-header">
        <span class="input-name">{name}</span>
        <span class="input-type">{prop.type}</span>
        <label class="req-toggle" title="Toggle required">
          <input
            type="checkbox"
            checked={requiredFields.has(name)}
            onchange={() => toggleRequired(name)}
          />
          <span class="req-label">req</span>
        </label>
        <button class="btn-remove" title="Remove field" onclick={() => removeField(name)}>✕</button>
      </div>
      <input
        class="field-input field-desc"
        type="text"
        value={prop.description ?? ''}
        placeholder="Description…"
        oninput={(e) => updateFieldDesc(name, (e.target as HTMLInputElement).value)}
      />
    </div>
  {/each}

  {#if showAddField}
    <div class="add-field-form">
      <input
        class="field-input"
        type="text"
        placeholder="Field name"
        bind:value={newFieldName}
      />
      <select class="field-input" bind:value={newFieldType}>
        <option value="string">string</option>
        <option value="integer">integer</option>
        <option value="number">number</option>
        <option value="boolean">boolean</option>
        <option value="object">object</option>
        <option value="array">array</option>
      </select>
      <input
        class="field-input"
        type="text"
        placeholder="Description (optional)"
        bind:value={newFieldDesc}
      />
      <label class="req-toggle">
        <input type="checkbox" bind:checked={newFieldRequired} />
        <span class="req-label">Required</span>
      </label>
      <div class="add-field-actions">
        <button class="btn btn--secondary" onclick={() => (showAddField = false)}>Cancel</button>
        <button class="btn btn--primary" onclick={addField}>Add</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .inputs-editor {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .inputs-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .inputs-title {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-muted);
    margin: 0;
  }

  .btn-icon {
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text-secondary);
    cursor: pointer;
    font-size: 0.85rem;
    line-height: 1;
    padding: 0.1rem 0.35rem;
    transition: background 0.15s;
  }

  .btn-icon:hover {
    background: var(--color-accent);
    color: #fff;
    border-color: var(--color-accent);
  }

  .input-field {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: 0.3rem 0.4rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg-card);
  }

  .input-field.required {
    border-left: 2px solid var(--color-accent);
  }

  .input-field-header {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .input-name {
    font-size: 0.78rem;
    font-weight: 600;
    font-family: var(--font-mono);
    color: var(--color-text-primary);
    flex: 1;
  }

  .input-type {
    font-size: 0.62rem;
    padding: 0.05rem 0.25rem;
    border-radius: 3px;
    background: var(--color-bg-input);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  .req-toggle {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    cursor: pointer;
    font-size: 0.62rem;
  }

  .req-toggle input {
    width: 0.8rem;
    height: 0.8rem;
    cursor: pointer;
  }

  .req-label {
    color: var(--color-text-muted);
    font-size: 0.62rem;
    text-transform: uppercase;
  }

  .btn-remove {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-text-muted);
    font-size: 0.7rem;
    padding: 0.1rem 0.2rem;
    transition: color 0.15s;
  }

  .btn-remove:hover {
    color: var(--color-danger);
  }

  .field-input {
    width: 100%;
    padding: 0.25rem 0.4rem;
    font-size: 0.75rem;
    background: var(--color-bg-input);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text-primary);
    box-sizing: border-box;
  }

  .field-input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .field-desc {
    font-size: 0.7rem;
    color: var(--color-text-secondary);
  }

  .add-field-form {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.5rem;
    border: 1px dashed var(--color-border);
    border-radius: 4px;
    background: var(--color-bg-card);
  }

  .add-field-actions {
    display: flex;
    gap: 0.35rem;
    justify-content: flex-end;
  }

  .btn {
    padding: 0.25rem 0.6rem;
    font-size: 0.72rem;
    font-weight: 500;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid transparent;
  }

  .btn--primary {
    background: var(--color-accent);
    color: #fff;
  }

  .btn--secondary {
    background: var(--color-bg-input);
    color: var(--color-text-primary);
    border-color: var(--color-border);
  }

  .empty-hint {
    font-size: 0.72rem;
    color: var(--color-text-muted);
    font-style: italic;
    margin: 0;
  }
</style>
