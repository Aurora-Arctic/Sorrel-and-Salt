import { describe, expect, it } from 'vitest';
import { expandIds, readTasksMd } from '../../scripts/tasks-md.mjs';

// The pure half of the TASKS.md reader the board and migration scripts share:
// task headings in file order, and the execution-order table's rows with
// their `→` ranges expanded by heading order (claude-docs/task-tracking.md,
// "Order"). Nothing in this file touches the real TASKS.md.

const TASKS_MD = [
  '## Execution order',
  '',
  '| Wave                  | Tasks                                                   | Why here |',
  '| --------------------- | ------------------------------------------------------- | -------- |',
  '| **1 — FK root**       | M2.2 · M2.3 · MB.5 · MW.1                               | prose    |',
  '| **7 — GraphQL**       | M3.1 → M3.3 · MB.43, internal order otherwise unchanged | prose    |',
  '| **9 — Workspaces**    | M6.1 → M9.9 · M3.3 → M3.1                               | prose    |',
  '',
  '**M2.2 — Install Better Auth with the Drizzle adapter** · 2h',
  '**M2.3 — Users table** · 1.5h',
  '**M3.1 — Mount GraphQL Yoga** · 1h',
  '**M3.2 — Pothos builder** · 2h',
  '**M3.3 — Apply graphql-armor** · 1h',
  '**M6.4 — ~~Row-Level Security policies~~** · **RETIRED 2026-09-17, not done**',
  '**MB.5 — Restore users FKs** · 1h · **merged, then superseded by MB.29**',
  '**MB.43 — Map service errors** · 3h',
  '**MW.1 — Compress the working docs for Wave 1** · 1h',
].join('\n');

describe('readTasksMd', () => {
  const tasks = readTasksMd(TASKS_MD);

  it('lists every heading in file order, with its hours, and marks a retired one', () => {
    expect(tasks.order).toEqual([
      'M2.2',
      'M2.3',
      'M3.1',
      'M3.2',
      'M3.3',
      'M6.4',
      'MB.5',
      'MB.43',
      'MW.1',
    ]);
    expect(tasks.hours.get('M2.3')).toBe(1.5);
    expect(tasks.hours.has('M6.4')).toBe(false);
    expect(tasks.retired.has('M6.4')).toBe(true);
  });

  it('reads the wave rows in table order with their ids', () => {
    expect(tasks.waves.map((wave) => wave.number)).toEqual([1, 7, 9]);
    expect(tasks.waves[0]).toMatchObject({
      name: 'FK root',
      ids: ['M2.2', 'M2.3', 'MB.5', 'MW.1'],
    });
  });

  // `M3.1 → M3.3` means the headings between them in file order, so a task
  // added between two numbered ones, or a lettered `M3.2a`, is included.
  it('expands a range by heading order and ignores the prose after a comma', () => {
    expect(tasks.waves[1].ids).toEqual(['M3.1', 'M3.2', 'M3.3', 'MB.43']);
  });

  it('reports a range it cannot resolve rather than guessing at it', () => {
    expect(tasks.waves[2].ids).toEqual([]);
    expect(tasks.unresolved).toEqual(['M6.1 → M9.9', 'M3.3 → M3.1']);
  });
});

describe('expandIds', () => {
  const order = ['M3.1', 'M3.2', 'M3.3'];

  it('keeps ids, expands ranges and drops anything else', () => {
    expect(expandIds('M3.3 · M3.1 → M3.2 · and a note', order)).toEqual({
      ids: ['M3.3', 'M3.1', 'M3.2'],
      unresolved: [],
    });
  });

  it('answers an empty list for empty text', () => {
    expect(expandIds('', order)).toEqual({ ids: [], unresolved: [] });
  });
});
