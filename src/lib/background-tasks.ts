import { after } from 'next/server';

// Better Auth's background tasks, its mails among them, run after the response, so an answer never waits on
// the mail transport and the time it takes cannot show whether a mail was sent (DESIGN.md §8, "Passwords").

const held = new Set<Promise<unknown>>();

/** Starts `task` once the response is sent, so an answer never waits on it; outside a request, where `after` throws, starts it at once and holds it for `settleHeldTasks`. */
export function runAfterResponse(task: () => Promise<unknown>): void {
  try {
    after(task);
  } catch {
    const started = task();
    held.add(started);
    void started.finally(() => held.delete(started)).catch(() => {});
  }
}

/** For a task already started: it runs on, and only its outcome is held until the response is sent. */
export function runInBackground(task: Promise<unknown>): void {
  runAfterResponse(() => task);
}

export async function settleHeldTasks(): Promise<void> {
  while (held.size > 0) await Promise.allSettled([...held]);
}
