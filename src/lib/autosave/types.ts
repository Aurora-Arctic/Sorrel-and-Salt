/**
 * Where an autosaving form stands: `idle`, a change waiting for its delay (`pending`), a save in flight or between retries (`saving`), the server
 * has the latest (`saved`), the retries ran out (`failed`), or someone else saved the row first (`conflict`).
 */
export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'failed' | 'conflict';

export type SaveContext = {
  /** The row's revision as the last save returned it, or the one the form opened at; `null` for a row not created yet. */
  revision: number | null;
  /** True only after Keep My Version: write whatever revision the row is at now. */
  force: boolean;
  /** The id the last save returned, so a save that created the row updates it next time; `null` before the first. */
  id: string | null;
};

export type SaveResult = { revision: number; savedAt: Date; id: string };

export type AutosaveOptions<TValue> = {
  /** The form's current values. Compared by `JSON.stringify`, so it must be plain data. */
  value: TValue;
  /** Whether the form differs from what it opened with. A clean form is never saved. */
  dirty: boolean;
  /** False until the form has somewhere to save to. Changes are still mirrored. */
  enabled: boolean;
  save: (value: TValue, context: SaveContext) => Promise<SaveResult>;
  delay?: number;
  maxWait?: number;
  /** A `mirrorKey()`: keep a copy of each change in this browser until the server confirms it. */
  mirror?: string;
  revision?: number | null;
  root?: { readonly current: HTMLElement | null };
};

type AutosaveConflict = { currentRevision: number };

export type AutosaveView = {
  status: AutosaveStatus;
  savedAt: Date | null;
  /** Set at `failed` only, never during the retries, and cleared when a save is sent again. */
  error: Error | null;
  conflict: AutosaveConflict | null;
  id: string | null;
};

export type Autosave = AutosaveView & {
  /** Saves now. Resolves once the server has the value, and rejects when it ends `failed` or in `conflict`. */
  flush: () => Promise<void>;
  retry: () => void;
  /**
   * After a conflict: `keep-mine` sends this value over the newer row;
   * `reload` drops it, and the caller resets the form from the server.
   */
  resolveConflict: (choice: 'reload' | 'keep-mine') => Promise<void>;
};

export type MirrorEntry<TValue> = { value: TValue; at: Date };
