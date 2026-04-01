import { writable, derived } from 'svelte/store';
import { workflowSpec } from './workflow';
import type { ParsedOpenApiSpec, ParsedOperation, ParsedOperationParam, JsonSchemaProperty } from '$lib/types/arazzo';
import yaml from 'js-yaml';

/** Map of source name → parsed spec (or loading/error state). */
interface SourceSpecState {
  specs: Record<string, {
    status: 'loading' | 'loaded' | 'error';
    spec?: ParsedOpenApiSpec;
    error?: string;
  }>;
}

const { subscribe, update, set } = writable<SourceSpecState>({ specs: {} });

/**
 * Resolve a potentially relative URL against a base. For local/relative
 * paths (like ./server-openapi.yaml) we can't fetch them in a browser
 * context, so we return them as-is for display but skip fetching.
 */
function isAbsoluteUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/** Parse an OpenAPI 3.x spec into our simplified representation. */
function parseOpenApiSpec(raw: Record<string, unknown>): ParsedOpenApiSpec {
  const info = (raw.info ?? {}) as Record<string, string>;
  const servers = raw.servers as { url: string; description?: string }[] | undefined;
  const paths = (raw.paths ?? {}) as Record<string, Record<string, unknown>>;
  const allSchemas = ((raw.components as Record<string, unknown>)?.schemas ?? {}) as Record<string, unknown>;

  const operations: ParsedOperation[] = [];
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'];

  for (const [path, pathItem] of Object.entries(paths)) {
    for (const method of methods) {
      const op = pathItem[method] as Record<string, unknown> | undefined;
      if (!op) continue;

      const operationId = (op.operationId as string) ?? `${method}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;

      // Parse parameters
      const rawParams = [
        ...((pathItem.parameters as unknown[]) ?? []),
        ...((op.parameters as unknown[]) ?? [])
      ] as Record<string, unknown>[];

      const parameters: ParsedOperationParam[] = rawParams.map((p) => {
        const paramSchema = resolveSchemaRef(p.schema as Record<string, unknown>, allSchemas);
        return {
          name: p.name as string,
          in: p.in as ParsedOperationParam['in'],
          required: (p.required as boolean) ?? false,
          description: p.description as string | undefined,
          schema: paramSchema as JsonSchemaProperty | undefined
        };
      });

      // Parse request body schema
      let requestBodySchema: Record<string, JsonSchemaProperty> | undefined;
      let requestBodyRequired: string[] | undefined;
      const reqBody = op.requestBody as Record<string, unknown> | undefined;
      if (reqBody) {
        const content = (reqBody.content ?? {}) as Record<string, Record<string, unknown>>;
        const jsonContent = content['application/json'];
        if (jsonContent?.schema) {
          const schema = resolveSchemaRef(jsonContent.schema as Record<string, unknown>, allSchemas);
          if (schema?.properties) {
            requestBodySchema = {};
            for (const [propName, propValue] of Object.entries(schema.properties as Record<string, unknown>)) {
              requestBodySchema[propName] = resolveSchemaRef(propValue as Record<string, unknown>, allSchemas) as unknown as JsonSchemaProperty;
            }
          }
          if (schema?.required) {
            requestBodyRequired = schema.required as string[];
          }
        }
      }

      // Parse response schemas (simplified: just 200/201)
      const rawResponses = (op.responses ?? {}) as Record<string, Record<string, unknown>>;
      const responses: ParsedOperation['responses'] = {};
      for (const [code, resp] of Object.entries(rawResponses)) {
        const respContent = (resp.content ?? {}) as Record<string, Record<string, unknown>>;
        const jsonResp = respContent['application/json'];
        let respSchema: Record<string, JsonSchemaProperty> | undefined;
        if (jsonResp?.schema) {
          const resolved = resolveSchemaRef(jsonResp.schema as Record<string, unknown>, allSchemas);
          if (resolved?.properties) {
            respSchema = {};
            for (const [pName, pVal] of Object.entries(resolved.properties as Record<string, unknown>)) {
              respSchema[pName] = resolveSchemaRef(pVal as Record<string, unknown>, allSchemas) as unknown as JsonSchemaProperty;
            }
          }
        }
        responses[code] = {
          description: resp.description as string | undefined,
          schema: respSchema
        };
      }

      operations.push({
        operationId,
        method: method.toUpperCase(),
        path,
        summary: op.summary as string | undefined,
        description: op.description as string | undefined,
        parameters,
        requestBodySchema,
        requestBodyRequired,
        responses
      });
    }
  }

  return {
    title: info.title ?? 'Unknown',
    version: info.version ?? '0.0.0',
    servers,
    operations
  };
}

/** Resolve a $ref to the actual schema, one level deep. */
function resolveSchemaRef(
  schema: Record<string, unknown> | undefined,
  allSchemas: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!schema) return undefined;
  if (schema.$ref && typeof schema.$ref === 'string') {
    // "#/components/schemas/Foo" → "Foo"
    const refName = (schema.$ref as string).split('/').pop()!;
    return (allSchemas[refName] as Record<string, unknown>) ?? schema;
  }
  return schema;
}

/** Fetch and parse a source spec by URL. */
async function fetchAndParseSpec(sourceName: string, url: string): Promise<void> {
  if (!isAbsoluteUrl(url)) {
    update((state) => ({
      specs: {
        ...state.specs,
        [sourceName]: { status: 'loaded', spec: { title: sourceName, version: '(local)', operations: [] } }
      }
    }));
    return;
  }

  update((state) => ({
    specs: { ...state.specs, [sourceName]: { status: 'loading' } }
  }));

  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} ${resp.statusText}`);
    const text = await resp.text();

    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(text) as Record<string, unknown>;
    } catch {
      raw = yaml.load(text) as Record<string, unknown>;
    }

    const parsed = parseOpenApiSpec(raw);
    update((state) => ({
      specs: { ...state.specs, [sourceName]: { status: 'loaded', spec: parsed } }
    }));
  } catch (e) {
    update((state) => ({
      specs: { ...state.specs, [sourceName]: { status: 'error', error: (e as Error).message } }
    }));
  }
}

/** Remove a source spec from the store. */
function removeSpec(sourceName: string) {
  update((state) => {
    const specs = { ...state.specs };
    delete specs[sourceName];
    return { specs };
  });
}

export const sourceSpecs = {
  subscribe,
  fetchSpec: fetchAndParseSpec,
  removeSpec
};

/** Derived: flat list of all operations across all loaded sources, tagged with source name. */
export const allOperations = derived(sourceSpecs, ($state) => {
  const result: { sourceName: string; operation: ParsedOperation }[] = [];
  for (const [sourceName, entry] of Object.entries($state.specs)) {
    if (entry.status === 'loaded' && entry.spec) {
      for (const op of entry.spec.operations) {
        result.push({ sourceName, operation: op });
      }
    }
  }
  return result;
});
