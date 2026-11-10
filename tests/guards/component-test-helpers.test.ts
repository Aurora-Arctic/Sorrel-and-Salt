import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromRoot } from '../support/paths';
import { readSource, sourceFiles } from '../support/repo-scan';

// How a component test presses Save, types into a field and fills one (change, then blur) is written once, in
// tests/support/interact.tsx. A local copy drifts from it, and a change to how a form is filled then has to be
// made in each copy.

const HOME = 'tests/support/interact.tsx';
const HELPERS = ['save', 'type', 'fill'];

// A local binding of any helper's name, exported or not, however it is declared: `const`, `let` or `var`, typed or not,
// a function (async or not), or destructured from a local harness. Each is the same copy under another keyword.
const NAMES = HELPERS.join('|');
const LOCAL = new RegExp(
  [
    `^\\s*(?:export\\s+)?(?:const|let|var)\\s+(?:${NAMES})\\s*[=:]`,
    `^\\s*(?:export\\s+)?(?:async\\s+)?function\\s*\\*?\\s*(?:${NAMES})\\s*[(<]`,
    // A key followed by `:` is renamed, so it binds nothing of that name.
    `\\b(?:const|let|var)\\s*\\{[^}]*\\b(?:${NAMES})\\b(?!\\s*:)[^}]*\\}\\s*=`,
  ].join('|'),
  'm',
);

const files = sourceFiles({ under: 'tests/components/' });

describe('form helpers component tests share', () => {
  it('tells a local copy from an import of the shared one', () => {
    expect(LOCAL.test("const save = () => screen.getByRole('button', { name: /^Sav/ });")).toBe(
      true,
    );
    expect(LOCAL.test('function type(address: string) {')).toBe(true);
    expect(LOCAL.test('  const fill = (label: string, text: string) => {')).toBe(true);
    expect(LOCAL.test('async function save(): Promise<HTMLElement> {')).toBe(true);
    expect(LOCAL.test('let save = () => button;')).toBe(true);
    expect(LOCAL.test('var fill = (label: string) => label;')).toBe(true);
    expect(
      LOCAL.test('const type: (label: string, text: string) => void = (label, text) => {};'),
    ).toBe(true);
    expect(LOCAL.test('const { save, sent } = heldSave();')).toBe(true);
    expect(LOCAL.test('const {\n  dialog,\n  type,\n} = harness();')).toBe(true);
    expect(LOCAL.test("import { fill, save, type } from '../../support/interact';")).toBe(false);
    expect(LOCAL.test('const { type: kind } = event;')).toBe(false);
    expect(LOCAL.test('const saved = await saveSpell();')).toBe(false);
  });

  it('exports save, submitForm, type and fill from the shared module', () => {
    const text = existsSync(fromRoot(HOME)) ? readSource(HOME) : '';
    const exported = [...text.matchAll(/^export\s+(?:const|function)\s+(\w+)/gm)].map(
      ([, name]) => name,
    );

    expect(exported).toEqual(expect.arrayContaining(['save', 'submitForm', 'type', 'fill']));
  });

  it('defines no save, type or fill of its own in a component test', () => {
    // Precondition: the scan reached the component tests, so an empty list is not a scan of nothing.
    expect(files.length).toBeGreaterThan(100);

    expect(files.filter((file) => LOCAL.test(readSource(file)))).toEqual([]);
  });
});
