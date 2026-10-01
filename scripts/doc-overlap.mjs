// Reports the runs of eight words that two or more live docs share — the
// measure behind "One home per fact" (claude-docs/README.md): a fact stated in
// two docs is two edits to correct. A report, not a guard: a citation's clause
// legitimately repeats a few words of what it cites, so no threshold is right.
//
//   node scripts/doc-overlap.mjs [--pairs N]   the total, and the N largest pairs (30)
//   node scripts/doc-overlap.mjs <a.md> <b.md> the passages a shares with b
//
// The live docs are the tracked Markdown under CLAUDE.md, .claude/ and
// claude-docs/, less archive/ and transcripts/, which are frozen.

import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RUN = 8;
const WORD = /[\p{L}\p{N}]+(?:['’./_-][\p{L}\p{N}]+)*/gu;

/** The words of a doc, lowercased, with each link read by its text alone. */
export function words(text) {
  return (
    text
      .replace(/\]\([^)]*\)/g, ']')
      .toLowerCase()
      .match(WORD) ?? []
  );
}

const runsOf = (list, n) =>
  list.slice(0, Math.max(0, list.length - n + 1)).map((_, i) => list.slice(i, i + n).join(' '));

/** The distinct runs shared by two or more docs, and the count each pair shares. */
export function overlap(docs, n = RUN) {
  const holders = new Map();
  for (const { path, text } of docs) {
    for (const run of new Set(runsOf(words(text), n))) {
      const list = holders.get(run);
      if (list) list.push(path);
      else holders.set(run, [path]);
    }
  }

  let shared = 0;
  const byPair = new Map();
  for (const paths of holders.values()) {
    if (paths.length < 2) continue;
    shared += 1;
    const sorted = [...paths].sort();
    for (let i = 0; i < sorted.length; i += 1) {
      for (let j = i + 1; j < sorted.length; j += 1) {
        const key = `${sorted[i]}\n${sorted[j]}`;
        byPair.set(key, (byPair.get(key) ?? 0) + 1);
      }
    }
  }

  const pairs = [...byPair].map(([key, runs]) => {
    const [a, b] = key.split('\n');
    return { a, b, runs };
  });
  pairs.sort((x, y) => y.runs - x.runs || x.a.localeCompare(y.a) || x.b.localeCompare(y.b));
  return { files: docs.length, shared, pairs };
}

/** The longest stretches of `a` made of runs `b` also holds, in `a`'s order. */
export function passages(a, b, n = RUN) {
  const list = words(a);
  const held = new Set(runsOf(words(b), n));
  const spans = [];
  runsOf(list, n).forEach((run, i) => {
    if (!held.has(run)) return;
    const last = spans.at(-1);
    if (last && i < last.end) last.end = i + n;
    else spans.push({ start: i, end: i + n });
  });
  return spans.map(({ start, end }) => list.slice(start, end).join(' '));
}

/** Whether a tracked path is a live doc or skill, rather than frozen or code. */
export function isLiveDoc(path) {
  if (!path.endsWith('.md')) return false;
  if (path === 'CLAUDE.md' || path.startsWith('.claude/')) return true;
  return path.startsWith('claude-docs/') && !/^claude-docs\/(archive|transcripts)\//.test(path);
}

function liveDocs() {
  return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
    .split('\0')
    .filter(isLiveDoc)
    .map((path) => ({ path, text: readFileSync(path, 'utf8') }));
}

function main(args) {
  const flag = args.indexOf('--pairs');
  const files = args.filter((arg, i) => !arg.startsWith('--') && (flag === -1 || i !== flag + 1));
  if (files.length === 2) {
    const [a, b] = files.map((path) => readFileSync(path, 'utf8'));
    for (const passage of passages(a, b)) console.log(`- ${passage}\n`);
    return;
  }
  if (files.length)
    throw new Error('usage: node scripts/doc-overlap.mjs [--pairs N] | <a.md> <b.md>');

  const top = flag === -1 ? 30 : Number(args[flag + 1]);
  const { files: count, shared, pairs } = overlap(liveDocs());
  console.log(
    `${shared} eight-word runs occur in two or more of the ${count} live docs and skills.\n`,
  );
  for (const { a, b, runs } of pairs.slice(0, top))
    console.log(`${String(runs).padStart(6)}  ${a} ↔ ${b}`);
}

// Runs the CLI only when invoked directly; the test imports the functions.
const invokedDirectly = (() => {
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();

if (invokedDirectly) main(process.argv.slice(2));
