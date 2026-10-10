import { compileString } from 'sass';
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fromRoot } from '../../support/paths';

// The user list's tips paint over the sticky Impersonate column (MB.59's
// tips, fixed in MB.63's PR). A tip's lower edge reaches into its own row,
// whose Impersonate cell comes later in the DOM; at the same z-index the cell
// paints over the tip's corner. Asserted on the compiled stylesheet because
// jsdom lays nothing out, and the e2e servers run with impersonation off, so
// no Playwright page draws the column.

const SCSS_DIR = fromRoot('src/scss');
const SOURCE = 'src/components/UserList/index.scss';

/** The `z-index` of the first rule whose selector is exactly `selector`. */
function zIndexOf(css: string, selector: string): number {
  const match = new RegExp(`(^|\\n)${selector.replace(/\./g, '\\.')} \\{([^}]*)\\}`).exec(css);
  if (!match) throw new Error(`No rule for ${selector}`);
  const value = /z-index:\s*(-?\d+)/.exec(match[2])?.[1];
  if (value === undefined) throw new Error(`${selector} sets no z-index`);
  return Number(value);
}

describe('UserList stacking', () => {
  const css = compileString(readFileSync(fromRoot(SOURCE), 'utf8'), {
    style: 'expanded',
    loadPaths: [SCSS_DIR, fromRoot('src/components/UserList')],
  }).css;

  it('reads the sticky column on its own layer', () => {
    expect(zIndexOf(css, '.user-list__impersonate')).toBeGreaterThan(0);
  });

  it.each(['.user-list__tip', '.user-list__history-tip', '.user-list__control-tip'])(
    'paints %s above the sticky Impersonate column',
    (selector) => {
      expect(zIndexOf(css, selector)).toBeGreaterThan(zIndexOf(css, '.user-list__impersonate'));
    },
  );
});
