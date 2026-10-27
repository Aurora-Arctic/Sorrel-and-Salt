/**
 * Where an autosaving form stands (M13.16): nothing to save (`idle`), a
 * change waiting for its delay (`pending`), a save in flight or between its
 * retries (`saving`), the server has the latest value (`saved`), the retries
 * ran out (`failed`), or someone else saved the row first (`conflict`).
 */
export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'failed' | 'conflict';

/** What the hook tells a save: the revision it last read, the row it saved, and whether to write over a newer one. */
export type SaveContext = {
  /** The row's revision as the last save returned it, or the one the form opened at; `null` for a row not created yet. */
  revision: number | null;
  /** True only after Keep My Version: write whatever revision the row is at now. */
  force: boolean;
  /** The id the last save returned, so a save that created the row updates it next time; `null` before the first. */
  id: string | null;
};

/** What a save answers once the server has the value. */
export type SaveResult = { revision: number; savedAt: Date; id: string };

export type AutosaveOptions<TValue> = {
  /** The form's current values. Compared by `JSON.stringify`, so it must be plain data. */
  value: TValue;
  /** Whether the form differs from what it opened with. A clean form is never saved. */
  dirty: boolean;
  /** False until the form has somewhere to save to. Changes are still mirrored. */
  enabled: boolean;
  save: (value: TValue, context: SaveContext) => Promise<SaveResult>;
  /** Milliseconds after the last change before saving. Default 3000. */
  delay?: number;
  /** The longest a run of changes waits, in milliseconds. Default 30000. */
  maxWait?: number;
  /** A `mirrorKey()`: keep a copy of each change in this browser until the server confirms it. */
  mirror?: string;
  /** The revision the form opened at, sent with the first save. Default `null`. */
  revision?: number | null;
  /** The form's root: focus leaving it saves at once. */
  root?: { readonly current: HTMLElement | null };
};

export type AutosaveConflict = { currentRevision: number };

export type AutosaveView = {
  status: AutosaveStatus;
  /** When the server last confirmed a save. */
  savedAt: Date | null;
  /**
   * Why the save failed for good: set at `failed` only, never during the
   * retries, and cleared when a save is sent again.
   */
  error: Error | null;
  conflict: AutosaveConflict | null;
  /** The id the last save returned. */
  id: string | null;
};

export type Autosave = AutosaveView & {
  /** Saves now. Resolves once the server has the value, and rejects when it ends `failed` or in `conflict`. */
  flush: () => Promise<void>;
  /** After `failed`: try again from the first retry. */
  retry: () => void;
  /**
   * After a conflict: `keep-mine` sends this value over the newer row;
   * `reload` drops it, and the caller resets the form from the server.
   */
  resolveConflict: (choice: 'reload' | 'keep-mine') => Promise<void>;
};

/** A mirrored value and when it was written. */
export type MirrorEntry<TValue> = { value: TValue; at: Date };
