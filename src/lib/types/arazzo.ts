/**
 * TypeScript types for the Arazzo Specification v1.0.0
 * https://spec.openapis.org/arazzo/v1.0.0
 */

export interface ArazzoSpec {
  arazzo: string;
  info: ArazzoInfo;
  sourceDescriptions: SourceDescription[];
  workflows: Workflow[];
  components?: ArazzoComponents;
}

export interface ArazzoInfo {
  title: string;
  summary?: string;
  description?: string;
  version: string;
}

export interface SourceDescription {
  name: string;
  url: string;
  type: 'openapi' | 'arazzo';
}

export interface Workflow {
  workflowId: string;
  summary?: string;
  description?: string;
  inputs?: WorkflowInputs;
  dependsOn?: string[];
  steps: Step[];
  successActions?: SuccessAction[];
  failureActions?: FailureAction[];
  outputs?: Record<string, string>;
  parameters?: Parameter[];
  /** Extension: guardrail check groups (from Blueprint pattern) */
  'x-guardrail-check-groups'?: string[];
  /** Extension: prohibited fields (from Blueprint pattern) */
  'x-prohibited-fields'?: {
    description?: string;
    fields: string[];
  };
}

export interface WorkflowInputs {
  type: string;
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
}

export interface JsonSchemaProperty {
  type: string;
  description?: string;
  format?: string;
  default?: unknown;
  enum?: string[];
  /** Extension: marks field as recommended vs required */
  'x-guardrail-level'?: 'required' | 'recommended';
  /** For object types */
  properties?: Record<string, JsonSchemaProperty>;
  required?: string[];
  /** For array types */
  items?: JsonSchemaProperty;
}

export interface Step {
  stepId: string;
  description?: string;
  operationId?: string;
  operationPath?: string;
  workflowId?: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  successCriteria?: Criterion[];
  onSuccess?: SuccessAction[];
  onFailure?: FailureAction[];
  outputs?: Record<string, string>;
}

export interface Parameter {
  name: string;
  in?: 'path' | 'query' | 'header' | 'cookie' | 'body';
  value: string;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
}

export interface RequestBody {
  contentType?: string;
  payload?: Record<string, unknown>;
  replacements?: PayloadReplacement[];
}

export interface PayloadReplacement {
  target: string;
  value: string;
}

export interface Criterion {
  context?: string;
  condition: string;
  type?: 'simple' | 'regex' | 'jsonpath' | 'xpath';
}

export interface SuccessAction {
  name: string;
  type: 'end' | 'goto';
  workflowId?: string;
  stepId?: string;
  criteria?: Criterion[];
}

export interface FailureAction {
  name: string;
  type: 'end' | 'retry' | 'goto';
  workflowId?: string;
  stepId?: string;
  retryCount?: number;
  retryAfter?: number;
  criteria?: Criterion[];
}

export interface ArazzoComponents {
  inputs?: Record<string, WorkflowInputs>;
  parameters?: Record<string, Parameter>;
  successActions?: Record<string, SuccessAction>;
  failureActions?: Record<string, FailureAction>;
}

// ─── Parsed OpenAPI types (for loaded source specs) ─────────────────

export interface ParsedOpenApiSpec {
  title: string;
  version: string;
  servers?: { url: string; description?: string }[];
  operations: ParsedOperation[];
}

export interface ParsedOperation {
  operationId: string;
  method: string;
  path: string;
  summary?: string;
  description?: string;
  parameters: ParsedOperationParam[];
  requestBodySchema?: Record<string, JsonSchemaProperty>;
  requestBodyRequired?: string[];
  responses?: Record<string, { description?: string; schema?: Record<string, JsonSchemaProperty> }>;
}

export interface ParsedOperationParam {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required: boolean;
  description?: string;
  schema?: JsonSchemaProperty;
}
