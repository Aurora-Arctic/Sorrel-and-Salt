import { compile } from 'sass';
import { describe, expect, it } from 'vitest';
import { fromRoot } from '../support/paths';

// The spinner is a span. Drawn inline, outside a flex parent such as a button, it ignores its width and height, and its
// border reads as "[": a sortable table's Position cell showed that while a reorder saved.

const css = compile(fromRoot('src/components/Spinner/index.scss'), { style: 'expanded' }).css;

/** Every declaration of the top-level rules for `selector`, later ones winning, as the cascade reads them. */
function declarationsOf(selector: string): Record<string, string> {
  const blocks = [
    ...css.matchAll(new RegExp(`^${selector.replace('.', '\\.')} \\{([^}]*)\\}`, 'gm')),
  ];
  if (blocks.length === 0) throw new Error(`No rule for ${selector}`);
  return Object.fromEntries(
    blocks.flatMap(([, body]) =>
      body
        .split(';')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => [
          line.slice(0, line.indexOf(':')).trim(),
          line.slice(line.indexOf(':') + 1).trim(),
        ]),
    ),
  );
}

describe('the spinner', () => {
  it('is a sized box in any parent, so a table cell draws the circle', () => {
    const rule = declarationsOf('.spinner');

    // Precondition: the circle is a sized, round border, which an inline box would not size.
    expect(rule).toMatchObject({ width: '1em', height: '1em' });
    expect(rule.display).toBe('inline-block');
  });
});
