// A range is the headings between its ends in file order (claude-docs/task-tracking.md, "Order").

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PROJECTS, defaultOf, projectBySlug } from './task-projects.mjs';

export const TASKS_INDEX = 'claude-docs/TASKS.md';
const TASKS_DIR = 'claude-docs/tasks';
const naturally = (a, b) => a.localeCompare(b, 'en', { numeric: true });

/**
 * The breakdown's files in reading order, picked out of a list of repo paths: TASKS.md, then each Project's `tasks/<slug>/*.md` in config order.
 * A ref from before the split by Project holds its files directly under `tasks/`, read after TASKS.md as the default Project's.
 */
export function orderTaskFiles(paths, projects = PROJECTS) {
  const files = paths.filter((path) => path.startsWith(`${TASKS_DIR}/`) && path.endsWith('.md'));
  const flat = files.filter((path) => path.split('/').length === 3).sort(naturally);
  const of = (project) =>
    files
      .filter(
        (path) => path.split('/').length === 4 && path.startsWith(`${TASKS_DIR}/${project.slug}/`),
      )
      .sort(naturally);
  return [...(paths.includes(TASKS_INDEX) ? [TASKS_INDEX] : []), ...flat, ...projects.flatMap(of)];
}

/** The Project whose directory holds `path`; TASKS.md and a file directly under `tasks/` or `waves/` are the default's. */
export function projectOfDocPath(path, projects = PROJECTS) {
  const match = /^claude-docs\/(?:tasks|waves)\/([^/]+)\/[^/]+\.md$/.exec(path);
  return (match && projectBySlug(match[1], projects)) || defaultOf(projects);
}

const fromRepo = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url));

function treeOf(dir) {
  return readdirSync(fromRepo(dir), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? treeOf(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`],
  );
}

export const TASKS_FILES = orderTaskFiles([TASKS_INDEX, ...treeOf(TASKS_DIR)]);

// `ID` and `HEADING` are what the project-progress tally imports, so the skill reads the same headings the same way.
export const ID = String.raw`[A-Z]+[0-9]*(?:\.[A-Z0-9]+)*[a-z]?`;
// `**<id> — Title** · 2h …` or `**<id> — ~~Title~~** · **RETIRED …**`
export const HEADING = new RegExp(String.raw`^\*\*(${ID}) — .*?\*\* · (?:([0-9.]+)h|\*\*RETIRED)`);
// `| **7 — GraphQL** | <id> → <id> · <id> · … |` in the execution-order table; `**N · 01 — Privacy**` names another Project's wave by its prefix.
export const WAVE_ROW = /^\| \*\*(?:([A-Z]) · )?(\d+) — ([^|*]+?)\*\*\s*\|([^|]*)\|/;
export const ID_ONLY = new RegExp(String.raw`^(${ID})$`);
export const ID_RANGE = new RegExp(String.raw`^(${ID})\s*→\s*(${ID})$`);

// A range whose ends are not both headings, in that order, is reported rather than guessed.
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
    if (row)
      waves.push({ letter: row[1], number: Number(row[2]), name: row[3].trim(), cell: row[4] });
  }
  const unresolved = [];
  for (const wave of waves) {
    const expanded = expandIds(wave.cell, order);
    wave.ids = expanded.ids;
    unresolved.push(...expanded.unresolved);
  }
  return { order, hours, retired, waves, unresolved };
}

// Tildes show literally in an issue title (.claude/rules/task-tracking.md, "Board layout").
const retiredTitle = (title) =>
  title.replace(new RegExp(String.raw`^(${ID}) — ~~(.*)~~$`), '$1 — [RETIRED] $2');

// Matched whatever its case, as `find` matches a title; the answer carries the heading's own (claude-docs/task-tracking.md, "Sync").
export function readEntry(text, id) {
  const lines = text.split('\n');
  const start = lines.findIndex(
    (line) => HEADING.exec(line)?.[1].toUpperCase() === id.toUpperCase(),
  );
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => HEADING.test(line) || line.startsWith('#'));
  const heading = HEADING.exec(lines[start]);
  const title = /^\*\*(.+?)\*\* · /.exec(lines[start])[1];
  return {
    id: heading[1],
    title: heading[2] === undefined ? retiredTitle(title) : title,
    hours: heading[2] === undefined ? undefined : Number(heading[2]),
    body: (end === -1 ? rest : rest.slice(0, end)).join('\n').trim(),
  };
}

/** The entry headed `<id> — …`, with the path of the file holding it, or null. */
export function findEntry(id, files = TASKS_FILES) {
  for (const path of files) {
    const entry = readEntry(readFileSync(fromRepo(path), 'utf8'), id);
    if (entry) return { ...entry, path };
  }
  return null;
}

export const loadTasksMdText = () =>
  TASKS_FILES.map((path) => readFileSync(fromRepo(path), 'utf8')).join('\n');

export const loadTasksMd = () => readTasksMd(loadTasksMdText());
