<script lang="ts">
  import type { Parameter, RequestBody, ParsedOperation, ParsedOperationParam, JsonSchemaProperty, WorkflowInputs } from '$lib/types/arazzo';

  interface Props {
    /** The resolved operation from the source spec (if loaded) */
    operation?: ParsedOperation;
    /** Current step parameters */
    parameters?: Parameter[];
    /** Current step request body */
    requestBody?: RequestBody;
    /** Workflow inputs (to suggest $inputs.xxx mappings) */
    workflowInputs?: WorkflowInputs;
    /** Callbacks */
    onParametersChange: (params: Parameter[]) => void;
    onRequestBodyChange: (body: RequestBody) => void;
  }

  let { operation, parameters = [], requestBody, workflowInputs, onParametersChange, onRequestBodyChange }: Props = $props();

  let inputPropertyNames = $derived(Object.keys(workflowInputs?.properties ?? {}));

  // Build a merged view of operation params + currently set values
  let paramEntries = $derived.by(() => {
    if (!operation) return (parameters ?? []).map((p) => ({ ...p, fromSpec: false, required: false, description: '' }));

    return operation.parameters.map((opParam) => {
      const existing = (parameters ?? []).find((p) => p.name === opParam.name && p.in === opParam.in);
      return {
        name: opParam.name,
        in: opParam.in,
        value: existing?.value ?? '',
        fromSpec: true,
        required: opParam.required,
        description: opParam.description ?? ''
      };
    });
  });

  // Request body fields from the operation
  let bodyFields = $derived.by(() => {
    if (!operation?.requestBodySchema) return [];
    const reqFields = operation.requestBodyRequired ?? [];
    return Object.entries(operation.requestBodySchema).map(([name, schema]) => ({
      name,
      type: schema.type ?? 'string',
      description: schema.description ?? '',
      required: reqFields.includes(name),
      currentValue: (requestBody?.payload as Record<string, unknown>)?.[name] ?? ''
    }));
  });

  function updateParam(index: number, value: string) {
    const entry = paramEntries[index];
    const newParams = [...(parameters ?? [])];
    const existingIdx = newParams.findIndex((p) => p.name === entry.name && p.in === entry.in);

    if (existingIdx >= 0) {
      if (value) {
        newParams[existingIdx] = { ...newParams[existingIdx], value };
      } else {
        newParams.splice(existingIdx, 1);
      }
    } else if (value) {
      newParams.push({ name: entry.name, in: entry.in, value });
    }
    onParametersChange(newParams);
  }

  function updateBodyField(fieldName: string, value: string) {
    const currentPayload = (requestBody?.payload ?? {}) as Record<string, unknown>;
    const newPayload = { ...currentPayload };
    if (value) {
      newPayload[fieldName] = value;
    } else {
      delete newPayload[fieldName];
    }
    onRequestBodyChange({
      contentType: requestBody?.contentType ?? 'application/json',
      payload: newPayload
    });
  }
</script>

<div class="param-mapper">
  <!-- URL / Path / Query Parameters -->
  {#if paramEntries.length > 0}
    <div class="param-section">
      <h4 class="param-section-title">Parameters</h4>
      {#each paramEntries as entry, i}
        <div class="param-row" class:required={entry.required}>
          <div class="param-meta">
            <span class="param-name">{entry.name}</span>
            <span class="param-in">{entry.in}</span>
            {#if entry.required}
              <span class="param-req">required</span>
            {/if}
          </div>
          {#if entry.description}
            <div class="param-desc">{entry.description}</div>
          {/if}
          <div class="param-value-row">
            <input
              class="field-input"
              type="text"
              value={entry.value}
              placeholder="$inputs.{entry.name}"
              oninput={(e) => updateParam(i, (e.target as HTMLInputElement).value)}
            />
            {#if inputPropertyNames.length > 0}
              <select
                class="field-input value-suggest"
                onchange={(e) => {
                  const sel = (e.target as HTMLSelectElement).value;
                  if (sel) updateParam(i, sel);
                  (e.target as HTMLSelectElement).value = '';
                }}
              >
                <option value="">Map to…</option>
                {#each inputPropertyNames as prop}
                  <option value="$inputs.{prop}">$inputs.{prop}</option>
                {/each}
              </select>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Request Body Fields -->
  {#if bodyFields.length > 0}
    <div class="param-section">
      <h4 class="param-section-title">Request Body Fields</h4>
      <p class="param-hint">Map fields from workflow inputs or set literal values.</p>
      {#each bodyFields as field}
        <div class="param-row" class:required={field.required}>
          <div class="param-meta">
            <span class="param-name">{field.name}</span>
            <span class="param-type">{field.type}</span>
            {#if field.required}
              <span class="param-req">required</span>
            {/if}
          </div>
          {#if field.description}
            <div class="param-desc">{field.description}</div>
          {/if}
          <div class="param-value-row">
            <input
              class="field-input"
              type="text"
              value={typeof field.currentValue === 'string' ? field.currentValue : JSON.stringify(field.currentValue)}
              placeholder="$inputs.{field.name}"
              oninput={(e) => updateBodyField(field.name, (e.target as HTMLInputElement).value)}
            />
            {#if inputPropertyNames.length > 0}
              <select
                class="field-input value-suggest"
                onchange={(e) => {
                  const sel = (e.target as HTMLSelectElement).value;
                  if (sel) updateBodyField(field.name, sel);
                  (e.target as HTMLSelectElement).value = '';
                }}
              >
                <option value="">Map to…</option>
                {#each inputPropertyNames as prop}
                  <option value="$inputs.{prop}">$inputs.{prop}</option>
                {/each}
              </select>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {:else if operation && !operation.requestBodySchema && (operation.method === 'POST' || operation.method === 'PUT' || operation.method === 'PATCH')}
    <div class="param-section">
      <h4 class="param-section-title">Request Body</h4>
      <p class="param-hint">This operation expects a request body but the schema wasn't parsed from the source spec. You can set the payload manually in the generated YAML.</p>
    </div>
  {/if}

  {#if !operation && paramEntries.length === 0}
    <div class="param-empty">
      Select an operation from a loaded source spec to see available parameters and body fields.
    </div>
  {/if}
</div>

<style>
  .param-mapper {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .param-section {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .param-section-title {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-muted);
    margin: 0;
  }

  .param-hint {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    margin: 0 0 0.2rem;
  }

  .param-row {
    padding: 0.35rem 0.4rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-bg-card);
  }

  .param-row.required {
    border-left: 2px solid var(--color-accent);
  }

  .param-meta {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-bottom: 0.15rem;
  }

  .param-name {
    font-size: 0.78rem;
    font-weight: 600;
    font-family: var(--font-mono);
    color: var(--color-text-primary);
  }

  .param-in,
  .param-type {
    font-size: 0.62rem;
    padding: 0.05rem 0.25rem;
    border-radius: 3px;
    background: var(--color-bg-input);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  .param-req {
    font-size: 0.6rem;
    color: var(--color-danger);
    font-weight: 600;
  }

  .param-desc {
    font-size: 0.68rem;
    color: var(--color-text-secondary);
    margin-bottom: 0.2rem;
  }

  .param-value-row {
    display: flex;
    gap: 0.3rem;
    align-items: center;
  }

  .field-input {
    flex: 1;
    padding: 0.25rem 0.4rem;
    font-size: 0.75rem;
    background: var(--color-bg-input);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text-primary);
    font-family: var(--font-mono);
    box-sizing: border-box;
  }

  .field-input:focus {
    outline: none;
    border-color: var(--color-accent);
  }

  .value-suggest {
    flex: 0 0 auto;
    width: 8rem;
    font-family: var(--font-mono);
    font-size: 0.68rem;
    cursor: pointer;
  }

  .param-empty {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    font-style: italic;
    padding: 0.4rem 0;
  }
</style>
