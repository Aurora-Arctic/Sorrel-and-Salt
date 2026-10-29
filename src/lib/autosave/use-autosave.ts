'use client';

import { useEffect, useRef, useState } from 'react';
import { GraphQLClientError, StaleWriteError } from '@/lib/graphql-client-error';
import { useLeaveGuard } from '@/lib/navigation';
import { clearMirror, writeMirror } from './mirror';
import type { Autosave, AutosaveOptions, AutosaveView, SaveContext, SaveResult } from './types';

// Saves a form while it is being edited: a timer per run of changes,
// one save in flight, retries with backoff, and a pause on a lost race. It is
// a plain closure held across renders rather than state and effects, because
// timers and an in-flight promise must see one another's latest state, not a
// render's snapshot. Why each number: claude-docs/components/autosave.md.

/** The waits before each retry of a failed save, after which it stops at `failed`. */
export const RETRY_DELAYS_MS = [2000, 5000, 15000] as const;

/** An answer that asking again will not change: the server read the request and said no. */
const isRefusal = (error: GraphQLClientError): boolean =>
  ['VALIDATION', 'FORBIDDEN', 'NOT_FOUND'].includes(String(error.errors?.[0]?.extensions?.code));

const INITIAL: AutosaveView = {
  status: 'idle',
  savedAt: null,
  error: null,
  conflict: null,
  id: null,
};

type Latest<TValue> = {
  value: TValue;
  save: (value: TValue, context: SaveContext) => Promise<SaveResult>;
  enabled: boolean;
  mirror: string | undefined;
  delay: number;
  maxWait: number;
};

type Waiter = { resolve: () => void; reject: (error: Error) => void };
type Timer = ReturnType<typeof setTimeout> | undefined;

function createEngine<TValue>(
  latest: { readonly current: Latest<TValue> },
  publish: (view: AutosaveView) => void,
  openedAt: number | null,
) {
  let view = INITIAL;
  let revision = openedAt;
  let delayTimer: Timer;
  let maxTimer: Timer;
  let retryTimer: Timer;
  let busy = false;
  let queued = false;
  let unsaved = false;
  let force = false;
  let attempts = 0;
  let halted: { kind: 'failed' | 'conflict'; error: Error } | null = null;
  let attached = true;
  let waiters: Waiter[] = [];
  // Every key written since the last confirmed save: a new row's key changes
  // once it has an id, and both copies go when the server has the value.
  const mirrored = new Set<string>();

  const set = (patch: Partial<AutosaveView>) => {
    view = { ...view, ...patch };
    if (attached) publish(view);
  };

  const clearTimers = () => {
    clearTimeout(delayTimer);
    clearTimeout(maxTimer);
    delayTimer = maxTimer = undefined;
  };

  const settle = (error?: Error) => {
    const settling = waiters;
    waiters = [];
    for (const waiter of settling) {
      if (error) waiter.reject(error);
      else waiter.resolve();
    }
  };

  const waitForSave = () =>
    new Promise<void>((resolve, reject) => {
      waiters.push({ resolve, reject });
    });

  const clearMirrored = () => {
    for (const key of mirrored) clearMirror(key);
    mirrored.clear();
  };

  function start() {
    clearTimers();
    if (busy) {
      queued = true;
      return;
    }
    if (!unsaved || !latest.current.enabled || halted || !attached) {
      settle();
      return;
    }
    void send();
  }

  async function send() {
    busy = true;
    queued = false;
    unsaved = false;
    clearTimers();
    clearTimeout(retryTimer);
    retryTimer = undefined;
    set({ status: 'saving', error: null });

    const { value, save } = latest.current;
    let result: SaveResult;
    try {
      result = await save(value, { revision, force, id: view.id });
    } catch (thrown) {
      failed(thrown);
      return;
    }

    revision = result.revision;
    attempts = 0;
    force = false;
    busy = false;
    // A change made while the save was in flight is not on the server yet,
    // and the mirror holds it.
    if (!unsaved) clearMirrored();
    // A flush that arrived mid-save queues a follow-up, but only a change
    // made since gives it something to send.
    const again = queued && unsaved && latest.current.enabled;
    queued = false;
    set({
      status: again ? 'saving' : delayTimer ? 'pending' : 'saved',
      savedAt: result.savedAt,
      error: null,
      conflict: null,
      id: result.id,
    });
    if (again) {
      start();
    } else if (!delayTimer) settle();
  }

  function failed(thrown: unknown) {
    unsaved = true;
    if (thrown instanceof StaleWriteError) {
      busy = false;
      queued = false;
      clearTimers();
      halted = { kind: 'conflict', error: thrown };
      set({ status: 'conflict', conflict: { currentRevision: thrown.currentRevision } });
      settle(thrown);
      return;
    }
    const error = thrown instanceof Error ? thrown : new Error(String(thrown));
    // A refusal (invalid, forbidden, not found) gets the same answer when asked
    // again, so it stops at `failed` at once; only a dropped connection or a
    // server fault is worth the retries.
    const refused = thrown instanceof GraphQLClientError && isRefusal(thrown);
    const wait = refused ? undefined : RETRY_DELAYS_MS[attempts];
    if (wait !== undefined && attached) {
      // Still busy: a change or a flush during the wait rides on the retry,
      // which sends the latest value.
      // `error` waits for the last attempt: set, it means the save has
      // failed for good.
      attempts += 1;
      set({ status: 'saving' });
      retryTimer = setTimeout(() => void send(), wait);
      return;
    }
    busy = false;
    queued = false;
    clearTimers();
    halted = { kind: 'failed', error };
    set({ status: 'failed', error });
    settle(error);
  }

  const retry = () => {
    if (halted?.kind !== 'failed') return;
    halted = null;
    attempts = 0;
    void send();
  };

  return {
    /** The value changed while dirty: mirror it, and mark it for the next save. */
    change() {
      unsaved = true;
      const key = latest.current.mirror;
      if (key) {
        writeMirror(key, latest.current.value);
        mirrored.add(key);
      }
    },

    /** Restart the delay, and start the longest wait if this run has none. */
    schedule() {
      if (halted || !unsaved) return;
      const { delay, maxWait } = latest.current;
      clearTimeout(delayTimer);
      delayTimer = setTimeout(start, delay);
      maxTimer ??= setTimeout(start, maxWait);
      if (!busy) set({ status: 'pending' });
    },

    /** The form went back to clean: nothing is waiting to be saved. */
    clean() {
      clearTimers();
      unsaved = false;
      if (view.status === 'pending') set({ status: view.savedAt ? 'saved' : 'idle' });
    },

    flush(): Promise<void> {
      if (halted?.kind === 'conflict') return Promise.reject(halted.error);
      const saved = waitForSave();
      if (halted?.kind === 'failed') retry();
      else if (busy) {
        clearTimers();
        queued = true;
      } else start();
      return saved;
    },

    retry,

    resolveConflict(choice: 'reload' | 'keep-mine'): Promise<void> {
      if (halted?.kind !== 'conflict' || !view.conflict) return Promise.resolve();
      revision = view.conflict.currentRevision;
      halted = null;
      if (choice === 'reload') {
        unsaved = false;
        clearMirrored();
        set({ status: 'idle', conflict: null, error: null });
        return Promise.resolve();
      }
      force = true;
      unsaved = true;
      const saved = waitForSave();
      void send();
      return saved;
    },

    attach() {
      attached = true;
      // A change made while detached (the page hidden and shown again, as a
      // navigation does) was kept but not published.
      publish(view);
    },

    /** Unmounted: stop every timer. The mirror keeps anything not yet saved. */
    detach() {
      attached = false;
      clearTimers();
      clearTimeout(retryTimer);
      retryTimer = undefined;
    },
  };
}

const ignore = () => {};

/**
 * Saves `value` 3 s after the last change, and at most 30 s into a run of
 * changes, while `dirty` and `enabled`; at once when the tab is hidden, focus
 * leaves `root`, or `flush()` is called. claude-docs/components/autosave.md.
 */
export function useAutosave<TValue>({
  value,
  dirty,
  enabled,
  save,
  delay = 3000,
  maxWait = 30000,
  mirror,
  revision = null,
  root,
}: AutosaveOptions<TValue>): Autosave {
  // The value as text: a form's `watch()` hands over a new object every
  // render, so identity says nothing about whether it changed.
  const key = JSON.stringify(value);

  const latest = useRef<Latest<TValue>>({ value, save, enabled, mirror, delay, maxWait });
  useEffect(() => {
    latest.current = { value, save, enabled, mirror, delay, maxWait };
  });

  const [view, setView] = useState(INITIAL);
  // oxlint-disable-next-line react/refs -- the ref is read once, in a state initialiser or after a held pointer, never to draw something else
  const [engine] = useState(() => createEngine(latest, setView, revision));

  useEffect(() => {
    engine.attach();
    return () => engine.detach();
  }, [engine]);

  // The first render is what the form opened with, not a change.
  const previous = useRef<{ key: string; enabled: boolean; dirty: boolean } | null>(null);
  useEffect(() => {
    const before = previous.current;
    previous.current = { key, enabled, dirty };
    if (!before) return;
    const changed = key !== before.key;
    if (dirty && changed) engine.change();
    if (dirty && enabled && (changed || !before.enabled)) engine.schedule();
    if (before.dirty && !dirty) engine.clean();
  }, [key, enabled, dirty, engine]);

  useEffect(() => {
    const node = root?.current;
    if (!node) return;
    const left = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && node.contains(event.relatedTarget)) return;
      engine.flush().catch(ignore);
    };
    node.addEventListener('focusout', left);
    return () => node.removeEventListener('focusout', left);
  }, [root, engine]);

  // The browser asks before closing the tab while anything is not on the
  // server; an in-app navigation is not held, since the mirror keeps the copy.
  const unconfirmed = view.status !== 'idle' && view.status !== 'saved';
  useLeaveGuard(unconfirmed, (proceed) => proceed(), {
    onHide: () => {
      engine.flush().catch(ignore);
    },
    holdNavigation: false,
  });

  return {
    ...view,
    flush: engine.flush,
    retry: engine.retry,
    resolveConflict: engine.resolveConflict,
  };
}
