import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';
import { fromRoot } from '../support/paths';

// M10.6's guard (claude-docs/db/spell-visibility.md, "Reading"): who may read
// a spell is `readableSpells` in src/db/repository/spells.ts, and nothing
// else in src/ compares a spell's visibility. A second comparison would be a
// second rule — a finder that agrees today and drifts tomorrow, or a service
// filtering rows after fetching them (CLAUDE.md rule 7). Read as text, so a
// new comparison fails here, in the diff that adds it.
//
// It catches the column in a query (`spells.visibility`, or any table's
// `.visibility` handed to a Drizzle operator), the word inside a raw sql``
// template, and a JavaScript comparison of a row's `.visibility`. Comments are
// stripped first, so prose may name the column freely.
//
// The first three scan all of src/. The JavaScript comparison scans only
// src/db/ and src/modules/, where read decisions live: a component or a
// GraphQL resolver compares `spell.visibility` to draw a private badge or a
// read-only control (M10.11, M10.13), on a spell the service has already let
// the viewer read. That is a display decision, not who may read the spell.

const PREDICATE_FILE = 'src/db/repository/spells.ts';
const PREDICATE = 'readableSpells';

/**
 * The one comparison allowed outside the predicate. `setSpellVisibility` has
 * already read the spell through `findOneSpell`, so the row is one the caller
 * may read; this compares its current visibility with the requested one to
 * refuse a narrowing (§5's one-way rule). It decides a write, not who reads.
 */
const ALLOWED = {
  file: 'src/modules/grimoire/services/spell-visibility.ts',
  text: "spell.visibility === 'workspace'",
};

/** Where read decisions live, and so the only place a JavaScript comparison is one. */
const DECIDING = /^src\/(?:db|modules)\//;

const PATTERNS: { name: string; pattern: RegExp; scope?: RegExp }[] = [
  { name: 'the spells.visibility column', pattern: /\bspells\.visibility\b/g },
  {
    name: 'a visibility column handed to a Drizzle operator',
    pattern:
      /\b(?:eq|ne|inArray|notInArray|isNull|isNotNull|gt|gte|lt|lte|like|ilike)\(\s*[\w.]+\.visibility\b/g,
  },
  { name: 'visibility inside a raw sql`` template', pattern: /\bsql`[^`]*\bvisibility\b[^`]*`/g },
  {
    name: 'a JavaScript comparison of a row’s visibility',
    pattern: /\.visibility\s*[!=]==?|[!=]==?\s*[\w.?]+\.visibility\b/g,
    scope: DECIDING,
  },
];

/** Comments blanked to spaces, newlines kept, so offsets and line numbers still match the file. */
function stripComments(text: string): string {
  const blank = (match: string) => match.replace(/[^\n]/g, ' ');
  return text.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/(^|[^:])\/\/[^\n]*/gm, blank);
}

/** The offsets of the one top-level `function name(...) { ... }` body, by brace matching. */
function bodyRange(text: string, name: string): [number, number] {
  const start = text.search(new RegExp(`^export function ${name}\\b`, 'm'));
  expect(start, `${name} is declared in ${PREDICATE_FILE}`).toBeGreaterThanOrEqual(0);
  const open = text.indexOf('{', text.indexOf(')', start));
  let depth = 0;
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === '{') depth += 1;
    if (text[index] === '}') {
      depth -= 1;
      if (depth === 0) return [open, index];
    }
  }
  throw new Error(`unbalanced braces reading ${name}`);
}

interface Hit {
  file: string;
  line: number;
  kind: string;
  text: string;
  index: number;
}

function hits(): Hit[] {
  const found: Hit[] = [];
  for (const file of inject('repoFiles')) {
    // src/gql/ is codegen output from the SDL, typing the field rather than reading it.
    if (!/^src\/.*\.tsx?$/.test(file) || file.startsWith('src/gql/')) continue;
    const text = stripComments(readFileSync(fromRoot(file), 'utf8'));
    for (const { name, pattern, scope } of PATTERNS) {
      if (scope && !scope.test(file)) continue;
      for (const match of text.matchAll(pattern)) {
        const index = match.index ?? 0;
        const line = text.slice(0, index).split('\n').length;
        found.push({ file, line, kind: name, text: text.split('\n')[line - 1].trim(), index });
      }
    }
  }
  return found;
}

describe('readableSpells is the only place a spell’s visibility decides a read', () => {
  it('finds no visibility comparison in src/ outside the predicate and the one-way check', () => {
    const all = hits();
    const predicateText = stripComments(readFileSync(fromRoot(PREDICATE_FILE), 'utf8'));
    const [from, to] = bodyRange(predicateText, PREDICATE);
    const inPredicate = (hit: Hit) =>
      hit.file === PREDICATE_FILE && hit.index > from && hit.index < to;
    const isAllowed = (hit: Hit) => hit.file === ALLOWED.file && hit.text.includes(ALLOWED.text);

    // Preconditions: the scan reaches both sanctioned comparisons, so an
    // empty result below is the rule holding, not a scan that read nothing.
    expect(all.filter(inPredicate).map((hit) => hit.kind)).toEqual(
      expect.arrayContaining([
        'the spells.visibility column',
        'a visibility column handed to a Drizzle operator',
      ]),
    );
    expect(all.filter(isAllowed)).toHaveLength(1);

    const offenders = all
      .filter((hit) => !inPredicate(hit) && !isAllowed(hit))
      .map(({ file, line, kind, text }) => `${file}:${line} ${kind}: ${text}`);
    expect(offenders).toEqual([]);
  });
});
