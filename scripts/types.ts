// Imported by scripts Node runs directly (`node scripts/<name>.ts`), whose
// type stripping erases an `import type` and keeps any other import: a plain
// `import { Finding }` survives and fails at link time, since nothing here is a
// runtime export. So a script imports this file with `import type`, and with
// the `.ts` extension Node's resolver needs, as for its other relative imports.

export interface Finding {
  file: string;
  rule: string;
  statement: string;
}

/** One `src/db/migrations/meta/_journal.json` entry, as much as the order check reads. */
export interface JournalEntry {
  idx: number;
  tag: string;
  when: number;
}

export type Classification = 'missing' | 'empty' | 'placeholder' | 'present';

export type Verdict = { ok: true } | { ok: false; code: string; message: string };

export interface Failure {
  key: string;
  code: string;
  message: string;
}

export interface AssertionResult {
  ok: boolean;
  report: string[];
  failures: Failure[];
}

export interface ProbeResult {
  ok: boolean;
  /** Present on success — which database actually answered. */
  identity?: { database: string; user: string; version: string };
  /** Present on failure — already scrubbed, safe to print. */
  description?: string;
}
