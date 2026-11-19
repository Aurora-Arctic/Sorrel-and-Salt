// `after` from `next/server` throws outside a request, so a test that must see the work a service leaves for after the
// response mocks it with `withScheduledAfter`, and runs what was scheduled with `runScheduledAfter`.
const scheduled: Array<() => unknown> = [];

/** `next/server` with `after` collecting its callbacks instead of throwing; the body of a `vi.mock('next/server', …)` factory. */
export function withScheduledAfter<Module extends object>(actual: Module): Module {
  return {
    ...actual,
    after: (task: (() => unknown) | PromiseLike<unknown>) => {
      scheduled.push(typeof task === 'function' ? task : () => task);
    },
  };
}

/** How many callbacks `after` has collected and nothing has run. */
export function scheduledAfterCount(): number {
  return scheduled.length;
}

export function discardScheduledAfter(): void {
  scheduled.length = 0;
}

/** Runs each collected callback, and any it schedules in turn, and waits for them; a failed one is swallowed, as Next does. */
export async function runScheduledAfter(): Promise<void> {
  while (scheduled.length > 0) {
    const next = scheduled.shift()!;
    await Promise.allSettled([Promise.resolve().then(next)]);
  }
}
