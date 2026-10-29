import type {
  HistoryAction,
  HistoryDiff,
  HistoryMerge,
  HistoryMergeInput,
  HistoryState,
  HistoryStep,
} from './types';

// The pure half of a form's undo and redo: the two stacks and the rules for what a new change
// does to them. The hook owns everything that touches the form, the DOM or the clock.

export const initialHistory: HistoryState = { past: [], future: [] };

/** How many steps are kept; the oldest go first. */
export const HISTORY_LIMIT = 100;

/** How long a pause in typing ends the step, in milliseconds. */
export const TYPING_PAUSE_MS = 500;

/** `diffs` folded into `into`: a name already there keeps its `before` and takes the new `after`. */
function mergeDiffs(into: HistoryDiff[], diffs: HistoryDiff[]): HistoryDiff[] {
  const merged = into.slice();
  for (const diff of diffs) {
    const at = merged.findIndex((existing) => existing.name === diff.name);
    if (at === -1) merged.push(diff);
    else merged[at] = { ...merged[at], after: diff.after };
  }
  return merged;
}

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  switch (action.type) {
    case 'recorded':
      // A new change ends the redo trail, as in every editor.
      return { past: [...state.past, action.step].slice(-action.limit), future: [] };
    case 'extended': {
      const newest = state.past[state.past.length - 1];
      if (!newest) return state;
      const extended: HistoryStep = {
        ...newest,
        diffs: mergeDiffs(newest.diffs, action.diffs),
        at: action.at,
      };
      return { ...state, past: [...state.past.slice(0, -1), extended] };
    }
    case 'undone': {
      const step = state.past[state.past.length - 1];
      if (!step) return state;
      return { past: state.past.slice(0, -1), future: [...state.future, step] };
    }
    case 'redone': {
      const step = state.future[state.future.length - 1];
      if (!step) return state;
      return { past: [...state.past, step], future: state.future.slice(0, -1) };
    }
    case 'cleared':
      return state.past.length === 0 && state.future.length === 0 ? state : initialHistory;
  }
}

/**
 * What a change does to the newest step. In the same tick it joins it (one action setting several
 * fields is one step), as does typing in the same box within the pause, and every change of one pointer
 * hold (a slider drag). Anything else, a select pick included, starts a step.
 */
export function decideMerge({
  newest,
  name,
  typing,
  now,
  pauseMs,
  sameTick,
  held,
  sealed,
}: HistoryMergeInput): HistoryMerge {
  if (!newest) return 'new';
  if (sameTick || held) return 'join';
  if (
    typing &&
    newest.typing &&
    !sealed &&
    newest.diffs.length === 1 &&
    newest.diffs[0].name === name &&
    now - newest.at <= pauseMs
  ) {
    return 'extend';
  }
  return 'new';
}

/** A copy of form values, arrays and plain objects deep, anything else as it is. */
export function cloneValues<T>(value: T): T {
  if (Array.isArray(value)) return value.map(cloneValues) as T;
  if (
    value !== null &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    const copy: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) copy[key] = cloneValues(item);
    return copy as T;
  }
  return value;
}

/** Whether two sets of form values hold the same things. */
export function sameValues(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((item, at) => sameValues(item, b[at]))
    );
  }
  if (
    a !== null &&
    b !== null &&
    typeof a === 'object' &&
    typeof b === 'object' &&
    Object.getPrototypeOf(a) === Object.prototype &&
    Object.getPrototypeOf(b) === Object.prototype
  ) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].every((key) =>
      sameValues((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
    );
  }
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return false;
}
