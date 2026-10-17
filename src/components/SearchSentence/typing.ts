// The editing the loading animation does. Nothing fades: the line is edited like text in a
// box. A line has three regions (the count, the search term, the clauses) so that an edit
// to one leaves the others as they are: a new count replaces the lead and the term beside
// it stays put.

export type Region = 'lead' | 'term' | 'clauses';

export interface Goal {
  lead: string;
  term: string;
  clauses: string;
}

export interface Line extends Goal {
  /** Where the caret is: the region last edited. */
  caret: Region;
}

/** One character a tick; a tick is about a frame. */
export const TICK_MS = 16;
/** Backspacing the old line takes at most about this long. */
export const WIPE_MS = 500;
/** How long the finished sentence is held before the clauses slide shut. */
export const HOLD_MS = 1000;
/** Characters a tick for the clauses still to type when the results land early. */
export const RUSH_STEP = 4;
/** What the lead says until the count is known. */
export const SEARCHING = 'Searching for ingredients';

/**
 * One edit towards the goal, or null when the line is the goal. A region that is not the
 * start of its goal loses its last character, the rightmost region first; otherwise the
 * first incomplete region gains one.
 */
export function convergeOnce(line: Line, goal: Goal): Line | null {
  for (const region of ['clauses', 'term', 'lead'] as const) {
    if (!goal[region].startsWith(line[region])) {
      return { ...line, [region]: line[region].slice(0, -1), caret: region };
    }
  }
  for (const region of ['lead', 'term', 'clauses'] as const) {
    if (line[region].length < goal[region].length) {
      return { ...line, [region]: goal[region].slice(0, line[region].length + 1), caret: region };
    }
  }
  return null;
}

export function advance(line: Line, goal: Goal, steps: number): Line {
  let next = line;
  for (let i = 0; i < steps; i += 1) {
    const edited = convergeOnce(next, goal);
    if (!edited) break;
    next = edited;
  }
  return next;
}

export function editsLeft(line: Line, goal: Goal): number {
  let count = 0;
  for (let next = convergeOnce(line, goal); next; next = convergeOnce(next, goal)) count += 1;
  return count;
}
