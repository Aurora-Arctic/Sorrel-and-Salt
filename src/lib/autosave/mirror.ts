import type { MirrorEntry } from './types';

// A copy of an autosaving form's value in this browser's localStorage:
// written on every change and cleared only once the server has
// confirmed a save, so a closed tab or a lost connection keeps what was typed.
// Storage can be absent, full or refused (a private window, blocked site
// data), so every access is in try/catch and a failure means no mirror.

/** A day: an older copy is too stale to offer back. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** `autosave:<entity>:<id|new>:<userId>`: per row and per person, so two people on one browser never see each other's copy. */
export function mirrorKey({
  entity,
  id,
  userId,
}: {
  entity: string;
  id: string | null;
  userId: string;
}): string {
  return `autosave:${entity}:${id ?? 'new'}:${userId}`;
}

export function writeMirror(key: string, value: unknown, at: Date = new Date()): void {
  try {
    window.localStorage.setItem(key, JSON.stringify({ value, at: at.toISOString() }));
  } catch {
    // No storage: the form goes on without a mirror.
  }
}

export function clearMirror(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // No storage: nothing was mirrored.
  }
}

/** The mirrored copy for recovery, or `null` when there is none, it is unreadable, or it is over a day old. */
export function readMirror<TValue>(
  key: string,
  now: Date = new Date(),
): MirrorEntry<TValue> | null {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === null) return null;
    const parsed: unknown = JSON.parse(stored);
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('at' in parsed) ||
      !('value' in parsed)
    ) {
      return null;
    }
    const at = new Date(String(parsed.at));
    if (Number.isNaN(at.getTime())) return null;
    if (now.getTime() - at.getTime() > MAX_AGE_MS) {
      clearMirror(key);
      return null;
    }
    return { value: parsed.value as TValue, at };
  } catch {
    return null;
  }
}
