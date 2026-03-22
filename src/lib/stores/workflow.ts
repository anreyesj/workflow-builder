import { writable, derived } from 'svelte/store';
import type { ArazzoSpec, Workflow, Step } from '$lib/types/arazzo';
import { sampleArazzoSpec } from '$lib/data/sample-arazzo';
import yaml from 'js-yaml';

/** Monotonically increasing counters ensure generated IDs are always unique. */
let workflowCounter = 1;
let stepCounter = 1;

function createWorkflowStore() {
  const { subscribe, set, update } = writable<ArazzoSpec>(sampleArazzoSpec);

  return {
    subscribe,

    /** Replace the entire spec. */
    setSpec(spec: ArazzoSpec) {
      set(spec);
    },

    /** Update the spec info field. */
    updateInfo(patch: Partial<ArazzoSpec['info']>) {
      update((s) => ({ ...s, info: { ...s.info, ...patch } }));
    },

    /** Add a new empty workflow. */
    addWorkflow() {
      const id = `workflow-${++workflowCounter}`;
      update((s) => ({
        ...s,
        workflows: [
          ...s.workflows,
          {
            workflowId: id,
            summary: 'New Workflow',
            steps: []
          }
        ]
      }));
    },

    /** Update a workflow by index. */
    updateWorkflow(index: number, patch: Partial<Workflow>) {
      update((s) => {
        const workflows = [...s.workflows];
        workflows[index] = { ...workflows[index], ...patch };
        return { ...s, workflows };
      });
    },

    /** Remove a workflow by index. */
    removeWorkflow(index: number) {
      update((s) => ({
        ...s,
        workflows: s.workflows.filter((_, i) => i !== index)
      }));
    },

    /** Add a new empty step to a workflow. */
    addStep(workflowIndex: number) {
      const id = `step-${++stepCounter}`;
      update((s) => {
        const workflows = [...s.workflows];
        const wf = workflows[workflowIndex];
        const newStep: Step = {
          stepId: id,
          description: 'New step',
          operationId: '',
          successCriteria: [{ condition: '$statusCode == 200' }]
        };
        workflows[workflowIndex] = { ...wf, steps: [...wf.steps, newStep] };
        return { ...s, workflows };
      });
    },

    /** Update a step within a workflow. */
    updateStep(workflowIndex: number, stepIndex: number, patch: Partial<Step>) {
      update((s) => {
        const workflows = [...s.workflows];
        const steps = [...workflows[workflowIndex].steps];
        steps[stepIndex] = { ...steps[stepIndex], ...patch };
        workflows[workflowIndex] = { ...workflows[workflowIndex], steps };
        return { ...s, workflows };
      });
    },

    /** Remove a step from a workflow. */
    removeStep(workflowIndex: number, stepIndex: number) {
      update((s) => {
        const workflows = [...s.workflows];
        workflows[workflowIndex] = {
          ...workflows[workflowIndex],
          steps: workflows[workflowIndex].steps.filter((_, i) => i !== stepIndex)
        };
        return { ...s, workflows };
      });
    },

    /** Add a source description. */
    addSource(name: string, url: string, type: 'openapi' | 'arazzo' = 'openapi') {
      update((s) => ({
        ...s,
        sourceDescriptions: [...s.sourceDescriptions, { name, url, type }]
      }));
    },

    /** Remove a source description by index. */
    removeSource(index: number) {
      update((s) => ({
        ...s,
        sourceDescriptions: s.sourceDescriptions.filter((_, i) => i !== index)
      }));
    },

    /** Load spec from a YAML or JSON string. */
    loadFromText(text: string) {
      try {
        const parsed = yaml.load(text) as ArazzoSpec;
        set(parsed);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: (e as Error).message };
      }
    }
  };
}

export const workflowSpec = createWorkflowStore();

/** Derived store: YAML representation of the spec. */
export const specYaml = derived(workflowSpec, ($spec) =>
  yaml.dump($spec, { indent: 2, lineWidth: 100, noRefs: true })
);

/** Derived store: JSON representation of the spec. */
export const specJson = derived(workflowSpec, ($spec) =>
  JSON.stringify($spec, null, 2)
);

/** Currently selected workflow index (for the tools pane). */
export const selectedWorkflowIndex = writable<number>(0);

/** Currently selected step index (-1 means no step selected). */
export const selectedStepIndex = writable<number>(-1);
