// What a claude-docs citation is, shared by the guard that fails one which does
// not resolve (tests/guards/doc-citation.test.ts) and the repoint that follows
// a summary split (scripts/repoint-doc-citations.mjs), so the rewrite reaches
// exactly the citations the guard reads.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

// Assembled so a file holding these patterns does not match them and report itself.
export const DOCS = 'claude-docs';
export const CITATION = new RegExp(`${DOCS}/[\\w./-]*\\.md`, 'g');

// What may sit between a cited file and the section it names: `, "…"`, `'s "…"`,
// either after the backtick closing a code span round the path, or the comma
// ending one comment line and the quote opening the next.
const TO_SECTION = `\`?['"]?,?s?(?: |\\s*\\n\\s*(?://|\\*|#)\\s*)"([^"]+)"`;
export const SECTION = new RegExp(`([\\w.-]+\\.md)${TO_SECTION}`, 'g');

/** A section named after `path`: group 1 runs from the path's end through the quote, group 2 is the quote. */
export function sectionOf(path) {
  return new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(${TO_SECTION})`, 'g');
}

/** A quoted section as one line, whatever comment wrapping it crossed. */
export function unwrap(section) {
  return section.replace(/\s*\n\s*(?:\/\/|\*|#)?\s*/g, ' ').trim();
}

/**
 * Tracked files plus untracked ones git would not ignore, so a citation is
 * caught in the diff that adds it. `src/db/migrations/` is excluded: drizzle
 * hashes each migration's content, so fixing a comment there is not the
 * harmless edit it looks like. A pathspec's `*` crosses `/`, so
 * `.claude/*.md` reaches every rule and skill file.
 */
export function citingFiles(root) {
  const args = ['-c', 'safe.directory=*', 'ls-files', '--cached', '--others', '--exclude-standard'];
  const globs = [
    '*.ts',
    '*.tsx',
    '*.mts',
    '*.mjs',
    '*.scss',
    '*.yml',
    '*.yaml',
    'makefile',
    'CLAUDE.md',
    '.claude/*.md',
  ];
  return execFileSync('git', [...args, ...globs], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .filter((file) => !file.startsWith(`${DOCS}/`) && !file.startsWith('src/db/migrations/'));
}

/** Every `claude-docs/….md` a text names, in source order, with duplicates dropped. */
export function citationsIn(text) {
  return [...new Set(text.match(CITATION) ?? [])];
}

/** Every `doc.md, "Section"` a text makes, against the full path the text names for `doc.md`. */
export function sectionCitesIn(text) {
  const cited = citationsIn(text);
  return [...text.matchAll(SECTION)].flatMap(([, doc, quoted]) => {
    const path = cited.find((candidate) => candidate.endsWith(`/${doc}`));
    return path ? [{ path, section: unwrap(quoted) }] : [];
  });
}

/**
 * A summary split by section, `db.md` beside `db/`, keeps every heading as its
 * index (claude-docs/README.md). Matched on the exact name, so a case-insensitive
 * filesystem does not take `TASKS.md` for the index of `tasks/`. A path whose
 * directory does not exist is no index; the guard fails it as missing.
 */
export function isSplitIndex(root, path) {
  const name = basename(path, '.md');
  const dir = join(root, dirname(path));
  return (
    existsSync(dir) &&
    readdirSync(dir, { withFileTypes: true }).some(
      (entry) => entry.isDirectory() && entry.name === name,
    )
  );
}
