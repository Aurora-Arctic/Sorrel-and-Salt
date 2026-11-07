import { after } from 'next/server';

// Better Auth's background tasks, its mails among them, run after the response, so an answer never waits on
// the mail transport and the time it takes cannot show whether a mail was sent (DESIGN.md §8, "Passwords").

const held = new Set<Promise<unknown>>();

/** Runs `task` once the response is sent; outside a request, where `after` throws, holds it for `settleHeldTasks`. */
export function runInBackground(task: Promise<unknown>): void {
  try {
    after(() => task);
  } catch {
    held.add(task);
    void task.finally(() => held.delete(task)).catch(() => {});
  }
}

export async function settleHeldTasks(): Promise<void> {
  while (held.size > 0) await Promise.allSettled([...held]);
}
