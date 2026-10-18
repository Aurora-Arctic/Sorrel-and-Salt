import { readFileSync } from 'node:fs';
import { describe, expect, inject, it } from 'vitest';

import { fromRoot } from '../support/paths';

// A form is shown in title case, through `formLabel` (claude-docs/components/
// ingredient-form.md, "Forms are shown in title case"). This sweeps the
// component and page source for a line that puts a variant's `form` on screen
// without it. It is a line check, not a type check: it sees `x.form` and a
// JSX `{form}`, and passes a line that does something else with the text
// (folds it, slugs it, keys a list by it).
//
// Not caught: a form copied into a local first (`const label = variant.form`)
// and shown from there, and a form that arrives as a plain string prop. A
// reviewer reads those; the lines below are what the check can prove.

const SOURCE = /^src\/(components|app)\/.*\.tsx$/;
const STORIES = /\.stories\.tsx$/;

/** Files that still show a form bare, each to be removed from here by its owner's PR. */
const PENDING = new Set<string>([]);

/** `x.form` the property: not `x.form.id`, `x.form?.elements`, or `LIST_KINDS.form`. */
const FORM_PROPERTY = /\.form\b(?!\??\.)/;
/** A JSX child that is a bare `form`. */
const BARE_FORM_CHILD = /(?<!=)\{form\}/;
/** `capitalise` is the old way a form was raised, and leaves "oil of cloves" as "Oil of cloves". */
const OLD_WAY = /capitalise\([^)]*\.form\)/;

/** What a line may do with `x.form` besides show it. */
const NOT_SHOWN =
  /\bfold(ed)?\(|\bslugify\(|\bkey=|\bconst form = |^\s*(\/\/|\*|\/\*)|\$\{at\}\.form|\.form\.trim\(\) [!=]==|[!=]== [\w.]*\.form\b|\bLIST_KINDS\b|\bGROUP_READERS\b|\bsameForm\(|\bsaid\(|\.map\(\(variant\) => variant\.form\)|variants\.\$\{/;

describe('forms are shown through formLabel', () => {
  const files = inject('repoFiles').filter((file) => SOURCE.test(file) && !STORIES.test(file));

  it('scans the components and pages', () => {
    // Precondition: an empty scan would let "nothing bare" pass for free.
    expect(files).toContain('src/components/IngredientEntry/index.tsx');
  });

  it('shows no form bare', () => {
    const bare = files
      .filter((file) => !PENDING.has(file))
      .flatMap((file) =>
        readFileSync(fromRoot(file), 'utf8')
          .split('\n')
          .flatMap((line, index) => {
            if (line.includes('formLabel(')) return [];
            const shows =
              OLD_WAY.test(line) ||
              BARE_FORM_CHILD.test(line) ||
              (FORM_PROPERTY.test(line) && !NOT_SHOWN.test(line));
            return shows ? [`${file}:${index + 1} shows a form without formLabel`] : [];
          }),
      );

    expect(bare).toEqual([]);
  });

  it('catches a bare form (the check itself)', () => {
    const line = '<span>{variant.form}</span>';
    expect(FORM_PROPERTY.test(line) && !NOT_SHOWN.test(line)).toBe(true);
    expect(OLD_WAY.test('capitalise(variant.form)')).toBe(true);
    expect(BARE_FORM_CHILD.test('<b>{form}</b>')).toBe(true);
  });
});
