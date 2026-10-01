import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../support/paths';

// A type or interface lives in a type-only file — by default the `types.ts`
// beside the code that uses it — and a code file declares none
// (claude-docs/modules.md, "Where types live"). Three kinds stay where they
// are, each read off the declaration rather than listed: one derived from a
// value declared in the same file (`z.output<typeof Schema>`, `(typeof
// UNITS)[number]`), which would have to import the value back; a branded proof,
// whose `unique symbol` lives beside the one function that mints it (CLAUDE.md
// rule 5); and the `ALLOWED` pair below. The scan reads column-0 declarations
// only, so a type declared inside a function, a `describe` or a `declare
// global` block is the enclosing code's own, and prettier is what makes column
// 0 a reliable statement boundary.

const ROOTS = ['src', 'scripts', 'tests'];

/**
 * Declarations that stay in a code file for a reason the scan cannot read.
 * Both are `typeof db`, and the client is importable only by the files whose
 * exemptions `lint-db-client-boundary.test.ts` pins.
 */
const ALLOWED = ['src/db/repository/select.ts:Executor', 'src/db/repository/write.ts:Transaction'];

/** The lint guards' throwaway probe directories. */
const isProbe = (path: string) => /(^|\/)__lint-probe[^/]*__(\/|$)/.test(path);

function exists(path: string): boolean {
  try {
    statSync(join(REPO_ROOT, path));
    return true;
  } catch {
    return false;
  }
}

function sourceFiles(): string[] {
  // `-c safe.directory=*`: CI's vitest job runs as root over a checkout owned
  // by uid 1000, which git refuses as "dubious ownership".
  const args = ['-c', 'safe.directory=*', 'ls-files', '--cached', '--others', '--exclude-standard'];
  const globs = ROOTS.flatMap((root) => [`${root}/*.ts`, `${root}/*.tsx`, `${root}/*.mts`]);
  return execFileSync('git', [...args, ...globs], { cwd: REPO_ROOT, encoding: 'utf8' })
    .split('\n')
    .filter((file) => file && !isProbe(file) && !file.startsWith('src/gql/'))
    .filter((file) => !/\.d\.m?ts$/.test(file))
    .filter((file) => exists(file)); // still in the index, gone from the working tree
}

const source = (file: string) => readFileSync(join(REPO_ROOT, file), 'utf8');

/**
 * A file whose every statement is an import, a type or a `declare`: each
 * non-blank column-0 line opens one of those, closes a bracket, or is a comment.
 */
const TYPE_ONLY_LINE =
  /^(?:import |export type |export interface |type |interface |declare |export declare |[}\])>]|\/\/|\/\*|\*)/;

function isTypeOnly(text: string): boolean {
  return text
    .split('\n')
    .filter((line) => line.trim() !== '' && !/^\s/.test(line))
    .every((line) => TYPE_ONLY_LINE.test(line));
}

/** A column-0 declaration's head: `export type Name`, `interface Name<…>`. */
const HEAD = /^(?:export )?(type|interface) ([A-Za-z_$][\w$]*)/gm;

/**
 * The declaration's code from its head to its end, comments dropped: a `type`
 * ends at the first `;` outside every bracket, an `interface` at the brace
 * closing its body. Angle brackets are counted only before an interface's body
 * opens, so a generic default of `{}` is not mistaken for the body.
 */
function extentAt(text: string, start: number, kind: 'type' | 'interface'): string {
  let code = '';
  let depth = 0;
  let angle = 0;
  let bodyOpen = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '/' && next === '/') {
      index = text.indexOf('\n', index) - 1;
      if (index < 0) break;
      continue;
    }
    if (char === '/' && next === '*') {
      index = text.indexOf('*/', index + 2) + 1;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      let end = index + 1;
      while (end < text.length && text[end] !== char) end += text[end] === '\\' ? 2 : 1;
      code += text.slice(index, end + 1);
      index = end;
      continue;
    }
    code += char;
    if (kind === 'interface' && !bodyOpen && depth === 0) {
      if (char === '<') angle += 1;
      if (char === '>' && text[index - 1] !== '=' && angle > 0) angle -= 1;
      if (char === '{' && angle === 0) bodyOpen = true;
    }
    if ('{(['.includes(char)) depth += 1;
    if ('})]'.includes(char)) {
      depth -= 1;
      if (kind === 'interface' && bodyOpen && depth === 0) return code;
    }
    if (kind === 'type' && char === ';' && depth === 0) return code;
  }
  throw new Error(`unterminated ${kind} at offset ${start}`);
}

/** Whether `name` is declared at column 0 of `text` as a value. */
const declaresValue = (text: string, name: string) =>
  new RegExp(
    `^(?:export )?(?:declare )?(?:const|let|var|(?:async )?function\\*?|class) ${name}\\b`,
    'm',
  ).test(text);

/** Whether `name` is declared at column 0 of `text` as a `unique symbol`. */
const declaresBrand = (text: string, name: string) =>
  new RegExp(`^declare const ${name}: unique symbol;`, 'm').test(text);

/** Every column-0 declaration in a code file, and why it may stay, if it may. */
function declarations(file: string) {
  const text = source(file);
  if (isTypeOnly(text)) return [];
  return [...text.matchAll(HEAD)].map((match) => {
    const [, kind, name] = match;
    const code = extentAt(text, match.index, kind as 'type' | 'interface');
    const id = `${file}:${name}`;
    const readsLocal = [...code.matchAll(/\btypeof\s+([A-Za-z_$][\w$]*)/g)].some(([, value]) =>
      declaresValue(text, value),
    );
    const branded = [...code.matchAll(/\[\s*([A-Za-z_$][\w$]*)\s*\]\s*:/g)].some(([, key]) =>
      declaresBrand(text, key),
    );
    const exemption = readsLocal
      ? 'derived from a value in this file'
      : branded
        ? 'branded proof'
        : ALLOWED.includes(id)
          ? 'allowed'
          : null;
    return { id, exemption };
  });
}

const found = sourceFiles().flatMap(declarations);
const exempt = (reason: string) =>
  found.filter((entry) => entry.exemption === reason).map((entry) => entry.id);

describe('types live in type-only files', () => {
  it('reads a declaration to its end', () => {
    // The shapes the scan must not cut short: a generic default of `{}` ahead
    // of an interface's body, and a union spread over lines.
    const text = [
      'export interface Keyset<Carried extends object = {}> extends KeyOrder {',
      '  carry?: { [K in keyof Carried]: SQL<Carried[K]> };',
      '  sort: typeof sorts;',
      '}',
      'export type Address =',
      "  | { kind: 'entry'; entry: Row }",
      "  | { kind: 'moved'; slug: string };",
      'const after = 1;',
    ].join('\n');
    const second = text.indexOf('export type');

    expect(extentAt(text, 0, 'interface')).toMatch(/typeof sorts;\n}$/);
    expect(extentAt(text, second, 'type')).toMatch(/slug: string };$/);
  });

  it('tells a type-only file from a code file', () => {
    expect(isTypeOnly(source('src/lib/session.ts'))).toBe(true);
    expect(isTypeOnly(source('src/modules/coven/services/membership.ts'))).toBe(false);
  });

  it('has declarations to check', () => {
    // Without these, an empty scan or a classifier that exempts nothing
    // would pass the assertion below for the wrong reason.
    expect(exempt('branded proof')).toEqual(
      expect.arrayContaining([
        'src/modules/coven/services/membership.ts:Membership',
        'src/modules/identity/services/site-admin.ts:SiteAdmin',
      ]),
    );
    expect(exempt('derived from a value in this file')).toContain(
      'src/modules/ingredients/validation/ingredient.ts:CompendiumIngredientInput',
    );
  });

  it('allows nothing that is gone', () => {
    expect(exempt('allowed').sort()).toEqual([...ALLOWED].sort());
  });

  it('declares no type in a code file', () => {
    const inline = found.filter((entry) => entry.exemption === null).map((entry) => entry.id);
    expect(inline).toEqual([]);
  });
});
