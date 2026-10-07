// GitHub workflow YAML, as the workflow guards read it: the keys they assert
// on, each optional where a workflow may omit it.

export interface Step {
  name?: string;
  if?: string;
  run?: string;
  env?: Record<string, string>;
  /** An action's inputs. */
  with?: Record<string, string | boolean>;
}

/** A `concurrency:` block, at the workflow's level or a job's. */
export interface Concurrency {
  group: string;
  'cancel-in-progress'?: boolean | string;
}

export interface Job {
  if?: string;
  needs?: string | string[];
  permissions?: Record<string, string>;
  concurrency?: Concurrency;
  outputs?: Record<string, string>;
  steps?: Step[];
  /** A reusable-workflow call's inputs. */
  with?: Record<string, string | boolean>;
  env?: Record<string, string>;
  /** checks.yml's legs, one `include` entry each. */
  strategy?: { matrix?: { include?: Record<string, string>[] } };
}

export interface Workflow {
  on?: {
    pull_request?: { types?: string[] };
    workflow_call?: { inputs?: Record<string, { required?: boolean; type?: string }> };
  };
  concurrency?: Concurrency;
  jobs: Record<string, Job>;
}

/**
 * pr-gate.yml: a `Workflow` whose trigger types and workflow-level
 * `concurrency`, cancel flag included, are read as present.
 */
export interface GateWorkflow extends Workflow {
  on: { pull_request: { types: string[] } };
  concurrency: Required<Concurrency>;
}

/** One `run:` line that invokes `vercel pull`. */
export interface VercelPull {
  file: string;
  job: string;
  /**
   * The step the invocation lives in, so its `if:` — which ties the
   * invocation to the one target its flags are legal on — can be read
   * alongside it.
   */
  step: Step;
  command: string;
}

/** One entry of oxlint's `--format json` report. */
export interface Diagnostic {
  code: string;
  filename: string;
  help?: string;
}

/** One generated file; `generate`'s own typings return `any`. */
export interface FileOutput {
  filename: string;
  content: string;
}

export interface ComposeService {
  profiles?: string[];
  command?: string[] | string;
  environment?: Record<string, string>;
  depends_on?: Record<string, { condition?: string }>;
}

export interface Compose {
  services: Record<string, ComposeService>;
  volumes: Record<string, unknown>;
}

export interface CopyInstruction {
  /** The instruction as written, continuations joined, for the failure message. */
  text: string;
  sources: string[];
}

/** One import: the importing file, and the module path it resolves to, extension dropped. */
export interface ImportEdge {
  from: string;
  to: string;
}

/** The little of a Vitest project's config the connection-budget guard reads. */
export interface Project {
  test?: { name?: unknown };
  plugins?: unknown;
}
