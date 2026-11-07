// Import this file with `import type` and the `.ts` extension: Node's type stripping keeps any other import,
// which fails at link time.

export interface Finding {
  file: string;
  rule: string;
  statement: string;
}

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
  identity?: { database: string; user: string; version: string };
  description?: string;
}
