import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// M14.8 (the owner's change of 2026-10-23): only the curator's switch,
// `setCompendiumEntryReviewed`, writes a compendium entry's review mark. A
// create, an edit or a promote leaves it as it was: no service write to an
// entry names the mark's columns, and the one repository writer that sets them
// is called from the switch alone. The behaviour is
// tests/modules/ingredients/services/compendium-review.test.ts's; this sweep is
// what fails a new writer in the diff that adds it. Read as text rather than
// run, so the `unit` project needs no database.

const SERVICES = 'src/modules';
const MARK_COLUMNS = /\bcuratorReviewed(?:At|By)\b/;

/** Every service file, by repo-relative path. */
function serviceFiles(): string[] {
  return readdirSync(join(REPO_ROOT, SERVICES), { withFileTypes: true })
    .filter((module) => module.isDirectory())
    .flatMap((module) => {
      const dir = `${SERVICES}/${module.name}/services`;
      try {
        return readdirSync(join(REPO_ROOT, dir))
          .filter((name) => name.endsWith('.ts'))
          .map((name) => `${dir}/${name}`);
      } catch {
        return [];
      }
    });
}

/** A compendium-tier insert or update whose table argument is `ingredients`. */
const WRITE = /\b(?:insert|update)\w*InCompendium\(\s*[\w.]+\s*,\s*ingredients\s*,/g;

/** The call's text from its opening parenthesis to the one that closes it. */
function callText(text: string, start: number): string {
  const open = text.indexOf('(', start);
  let depth = 0;
  for (let at = open; at < text.length; at += 1) {
    if (text[at] === '(') depth += 1;
    if (text[at] === ')') depth -= 1;
    if (depth === 0) return text.slice(open, at + 1);
  }
  throw new Error('unbalanced call');
}

/** `text` without its comments, which may name the columns. */
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');

const files = serviceFiles().map((file) => ({
  file,
  text: readFileSync(join(REPO_ROOT, file), 'utf8'),
}));

const writes = files.flatMap(({ file, text }) =>
  [...text.matchAll(WRITE)].map((match) => ({
    where: `${file}:${text.slice(0, match.index).split('\n').length}`,
    call: callText(text, match.index),
  })),
);

describe('the compendium review mark', () => {
  it('finds the writers it sweeps', () => {
    // Create, edit and promote: a sweep that finds fewer has lost its pattern.
    expect(writes.length).toBeGreaterThanOrEqual(3);
  });

  it.each(writes.map((write) => [write.where, write.call]))(
    'is not written by the call at %s',
    (_where, call) => {
      expect(call).not.toMatch(MARK_COLUMNS);
    },
  );

  it('is named by no service file: the repository writes it, for the switch alone', () => {
    const named = files.filter(({ text }) => MARK_COLUMNS.test(code(text))).map(({ file }) => file);
    expect(named).toEqual([]);
  });

  it('is set only from setCompendiumEntryReviewed', () => {
    const callers = files.filter(({ text }) => /\bsetReviewInCompendium\(/.test(code(text)));
    // Why this could fail: the switch calls it, so none found means the pattern broke.
    expect(callers.map(({ file }) => file)).toEqual([
      'src/modules/ingredients/services/compendium.ts',
    ]);
    const text = code(callers[0].text);
    const start = text.indexOf('export async function setCompendiumEntryReviewed');
    const end = text.indexOf('\n}\n', start);
    expect(start).toBeGreaterThan(-1);
    expect(text.slice(0, start) + text.slice(end)).not.toMatch(/\bsetReviewInCompendium\(/);
  });
});
