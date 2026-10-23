import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// M14.8: every curator write to a compendium entry's own row says whether the
// entry is reviewed. A create, an edit or a promote marks it with
// `reviewMark(...)`; the toggle that clears it writes `NEEDS_REVIEW`. The
// behaviour is tests/modules/ingredients/services/compendium-review.test.ts's;
// this sweep is what fails a new writer in the diff that adds it. Read as text
// rather than run, so the `unit` project needs no database.

const SERVICES = 'src/modules';

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

const writes = serviceFiles().flatMap((file) => {
  const text = readFileSync(join(REPO_ROOT, file), 'utf8');
  return [...text.matchAll(WRITE)].map((match) => ({
    where: `${file}:${text.slice(0, match.index).split('\n').length}`,
    call: callText(text, match.index),
  }));
});

describe('the compendium review mark', () => {
  it('finds the writers it sweeps', () => {
    // Create, edit, promote and the toggle: a sweep that finds fewer has lost its pattern.
    expect(writes.length).toBeGreaterThanOrEqual(4);
  });

  it.each(writes.map((write) => [write.where, write.call]))(
    'is set or cleared by the write at %s',
    (_where, call) => {
      expect(call).toMatch(/\breviewMark\(|\bNEEDS_REVIEW\b/);
    },
  );
});
