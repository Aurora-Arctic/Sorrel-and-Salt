import { describe, expect, it } from 'vitest';
import {
  HISTORY_LIMIT,
  cloneValues,
  decideMerge,
  historyReducer,
  initialHistory,
  sameValues,
} from '@/components/Field/form-history';
import type { HistoryState, HistoryStep } from '@/components/Field/types';

const step = (
  name: string,
  before: unknown,
  after: unknown,
  at = 0,
  typing = false,
): HistoryStep => ({
  diffs: [{ name, before, after }],
  at,
  typing,
});
const record = (state: HistoryState, next: HistoryStep, limit = HISTORY_LIMIT) =>
  historyReducer(state, { type: 'recorded', step: next, limit });

describe('historyReducer', () => {
  it('undoes the newest step onto the future, and redoes it back', () => {
    const first = step('a', 1, 2);
    const second = step('b', 'x', 'y');
    let state = record(record(initialHistory, first), second);
    state = historyReducer(state, { type: 'undone' });
    expect(state.past).toEqual([first]);
    expect(state.future).toEqual([second]);
    state = historyReducer(state, { type: 'redone' });
    expect(state.past).toEqual([first, second]);
    expect(state.future).toEqual([]);
  });

  it('leaves an empty stack as it is when undone or redone', () => {
    expect(historyReducer(initialHistory, { type: 'undone' })).toBe(initialHistory);
    expect(historyReducer(initialHistory, { type: 'redone' })).toBe(initialHistory);
  });

  it('empties the future when a new step follows an undo', () => {
    let state = record(initialHistory, step('a', 1, 2));
    state = historyReducer(state, { type: 'undone' });
    expect(state.future).toHaveLength(1);
    state = record(state, step('a', 1, 3));
    expect(state.future).toHaveLength(0);
  });

  it('clears both stacks', () => {
    let state = record(record(initialHistory, step('a', 1, 2)), step('a', 2, 3));
    state = historyReducer(state, { type: 'undone' });
    expect(historyReducer(state, { type: 'cleared' })).toEqual(initialHistory);
  });

  it('keeps the newest 100 steps', () => {
    let state = initialHistory;
    for (let at = 0; at < HISTORY_LIMIT + 5; at++) state = record(state, step('a', at, at + 1));
    expect(state.past).toHaveLength(HISTORY_LIMIT);
    expect(state.past[0].diffs[0].before).toBe(5);
  });

  it('extends the newest step, keeping its first before', () => {
    let state = record(initialHistory, step('a', 'x', 'xy', 10, true));
    state = historyReducer(state, {
      type: 'extended',
      diffs: [{ name: 'a', before: 'xy', after: 'xyz' }],
      at: 20,
    });
    expect(state.past).toHaveLength(1);
    expect(state.past[0].diffs).toEqual([{ name: 'a', before: 'x', after: 'xyz' }]);
    expect(state.past[0].at).toBe(20);
  });

  it('joins a diff for another field into the newest step', () => {
    let state = record(initialHistory, step('kind', 'a', 'none'));
    state = historyReducer(state, {
      type: 'extended',
      diffs: [{ name: 'canonical', before: 'Foo', after: '' }],
      at: 0,
    });
    expect(state.past[0].diffs.map((diff) => diff.name)).toEqual(['kind', 'canonical']);
  });
});

describe('decideMerge', () => {
  const typed = step('name', 'a', 'ab', 1000, true);
  const base = {
    newest: typed,
    name: 'name',
    typing: true,
    now: 1200,
    pauseMs: 500,
    sameTick: false,
    held: false,
    sealed: false,
  };

  it('starts a step when there is none', () => {
    expect(decideMerge({ ...base, newest: undefined })).toBe('new');
  });

  it('joins a later change of a pointer hold, whatever the field and the pause', () => {
    expect(
      decideMerge({ ...base, name: 'other', typing: false, now: 9000, held: true, sealed: true }),
    ).toBe('join');
  });

  it('starts a step for the first change of a hold, which has no step yet', () => {
    expect(decideMerge({ ...base, name: 'other', typing: false })).toBe('new');
  });

  it('joins a change in the same tick', () => {
    expect(decideMerge({ ...base, name: 'other', typing: false, sameTick: true })).toBe('join');
  });

  it('extends typing in the same box within the pause', () => {
    expect(decideMerge(base)).toBe('extend');
  });

  it('starts a step once the pause has passed', () => {
    expect(decideMerge({ ...base, now: 1501 })).toBe('new');
  });

  it('starts a step once focus has left', () => {
    expect(decideMerge({ ...base, sealed: true })).toBe('new');
  });

  it('starts a step for another box', () => {
    expect(decideMerge({ ...base, name: 'other' })).toBe('new');
  });

  it('never merges a pick with typing', () => {
    expect(decideMerge({ ...base, typing: false })).toBe('new');
    expect(decideMerge({ ...base, newest: step('name', 'a', 'b', 1000, false) })).toBe('new');
  });

  it('does not extend a step that holds several fields', () => {
    const several: HistoryStep = {
      ...typed,
      diffs: [...typed.diffs, { name: 'other', before: '', after: 'x' }],
    };
    expect(decideMerge({ ...base, newest: several })).toBe('new');
  });
});

describe('cloneValues and sameValues', () => {
  it('copies nested values apart from the original', () => {
    const original = { a: [{ b: 1 }], c: 'x' };
    const copy = cloneValues(original);
    expect(sameValues(original, copy)).toBe(true);
    copy.a[0].b = 2;
    expect(original.a[0].b).toBe(1);
    expect(sameValues(original, copy)).toBe(false);
  });

  it('tells arrays of different length or order apart', () => {
    expect(sameValues([1, 2], [1, 2, 3])).toBe(false);
    expect(sameValues([1, 2], [2, 1])).toBe(false);
    expect(sameValues({ a: undefined }, {})).toBe(true);
  });
});
