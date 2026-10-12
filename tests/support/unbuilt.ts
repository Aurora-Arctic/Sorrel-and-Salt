import { expect } from 'vitest';

// A scaffold's stand-in for an import of a service no task has built yet: an
// import of a name that is not there fails typecheck instead of the story it
// belongs to (claude-docs/testing/acceptance.md, "Acceptance"). The task that
// builds the service replaces the lookup with the import.

/**
 * `module` as `T`, once each of `names` is a function on it — failing with the
 * task that builds it, so a red story says what it is waiting on.
 *
 * ```ts
 * const { createWorkspace } = surface<WorkspaceWrites>(
 *   await import('@/modules/coven'),
 *   ['createWorkspace'],
 *   'M6.7',
 * );
 * ```
 */
export function surface<T extends object>(
  module: object,
  names: readonly (keyof T & string)[],
  task: string,
): T {
  for (const name of names) {
    expect(
      (module as Record<string, unknown>)[name],
      `${task} has not built ${name} yet`,
    ).toBeTypeOf('function');
  }
  return module as T;
}
