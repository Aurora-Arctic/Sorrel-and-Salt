// The breakdown's reader, shared by the board script, the migration and the
// project-progress tally: task headings in file order, and the execution-order
// table's rows with their `→` ranges expanded. A range means the headings
// between its ends in file order, not a numeric span, so a task added between
// two numbered ones sits inside it (claude-docs/task-tracking.md, "Order").

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * The breakdown's files, repo-relative and in reading order: TASKS.md, whose
 * table names the waves, then the milestone sections. Declared rather than
 * listed from the directory because the order is what a range is expanded
 * by; tests/guards/tasks-md-sequence.test.ts fails a file in
 * claude-docs/tasks/ this list leaves out.
 */
export const TASKS_FILES = [
  'claude-docs/TASKS.md',
  'claude-docs/tasks/m0.md',
  'claude-docs/tasks/m1.md',
  'claude-docs/tasks/m2.md',
  'claude-docs/tasks/m3.md',
  'claude-docs/tasks/m4.md',
  'claude-docs/tasks/m5.md',
  'claude-docs/tasks/m6.md',
  'claude-docs/tasks/m7.md',
  'claude-docs/tasks/m8.md',
  'claude-docs/tasks/m9.md',
  'claude-docs/tasks/m10.md',
  'claude-docs/tasks/m11.md',
  'claude-docs/tasks/m7a.md',
  'claude-docs/tasks/mb.md',
  'claude-docs/tasks/mw.md',
];

/** A repo-relative path, resolved from this script rather than the cwd. */
const fromRepo = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));

// `ID` and `HEADING` are what the project-progress tally imports, so the skill
// reads the same headings the same way.
export const ID = String.raw`[A-Z]+[0-9]*(?:\.[A-Z0-9]+)*[a-z]?`;
// `**M2.6 — Title** · 2h …` or `**M6.4 — ~~Title~~** · **RETIRED …**`
export const HEADING = new RegExp(String.raw`^\*\*(${ID}) — .*?\*\* · (?:([0-9.]+)h|\*\*RETIRED)`);
// `| **7 — GraphQL** | M3.1 → M3.2 · MB.73 · … |` in the execution-order table.
export const WAVE_ROW = /^\| \*\*(\d+) — ([^|*]+?)\*\*\s*\|([^|]*)\|/;
export const ID_ONLY = new RegExp(String.raw`^(${ID})$`);
export const ID_RANGE = new RegExp(String.raw`^(${ID})\s*→\s*(${ID})$`);

/**
 * The ids a cell names, in its order: ids kept, ranges expanded by `order`,
 * anything else (a row's prose tail after a comma) dropped. A range whose
 * ends are not both headings, in that order, is reported rather than guessed.
 */
export function expandIds(cell, order) {
  const index = new Map(order.map((id, i) => [id, i]));
  const ids = [];
  const unresolved = [];
  for (const token of cell.split(/\s*[·,]\s*/).map((part) => part.trim())) {
    const range = ID_RANGE.exec(token);
    if (range) {
      const [from, to] = [index.get(range[1]), index.get(range[2])];
      if (from === undefined || to === undefined || to < from) unresolved.push(token);
      else ids.push(...order.slice(from, to + 1));
    } else if (ID_ONLY.test(token)) {
      ids.push(token);
    }
  }
  return { ids, unresolved };
}

export function readTasksMd(text) {
  const order = [];
  const hours = new Map();
  const retired = new Set();
  const waves = [];
  for (const line of text.split('\n')) {
    const heading = HEADING.exec(line);
    if (heading) {
      order.push(heading[1]);
      if (heading[2] === undefined) retired.add(heading[1]);
      else hours.set(heading[1], Number(heading[2]));
      continue;
    }
    const row = WAVE_ROW.exec(line);
    if (row) waves.push({ number: Number(row[1]), name: row[2].trim(), cell: row[3] });
  }
  const unresolved = [];
  for (const wave of waves) {
    const expanded = expandIds(wave.cell, order);
    wave.ids = expanded.ids;
    unresolved.push(...expanded.unresolved);
  }
  return { order, hours, retired, waves, unresolved };
}

/** Every file in `TASKS_FILES`, in that order, as one text. */
export const loadTasksMdText = () =>
  TASKS_FILES.map((path) => readFileSync(fromRepo(path), 'utf8')).join('\n');

/** `readTasksMd` over the files on disk. */
export const loadTasksMd = () => readTasksMd(loadTasksMdText());
