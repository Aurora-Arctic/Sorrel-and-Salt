// Import this file with `import type` and the `.ts` extension: Node's type stripping keeps any other import,
// which fails at link time.

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
