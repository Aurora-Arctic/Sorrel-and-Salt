import { readFileSync } from 'node:fs';
import { compileString } from 'sass';
import { describe, expect, inject, it } from 'vitest';
import { fromRoot } from '../support/paths';

// Each one-pixel border the sheets share is one token in _variables.scss, so its weight and style change in one
// place. A pattern reads the value, so it covers every border property and side, a namespaced or interpolated
// colour, and any spacing or line break between the parts; a longer name (`$hairline-border`) is another token.

const STYLESHEET = /^(src|\.storybook)\/.*\.scss$/;
const VARIABLES = 'src/scss/_variables.scss';

const handWritten = (colour: string) =>
  new RegExp(String.raw`\b1px\s+solid\s+(?:#\{\s*)?(?:[\w-]+\.)?\$${colour}(?![\w-])`, 'g');

const TOKENS = [
  {
    token: 'hairline-border',
    colour: 'hairline',
    reader: 'src/components/CategoryChips/index.scss',
  },
  { token: 'muted-border', colour: 'text-muted', reader: 'src/components/MenuButton/index.scss' },
];

describe.each(TOKENS)('the $token token', ({ token, colour, reader }) => {
  it(`is written as $${token}, never as a hand-written 1px solid $${colour}`, () => {
    const files = inject('repoFiles').filter((file) => STYLESHEET.test(file));

    // Precondition: the scan reached the variables file, the workshop's sheets, and a component sheet that
    // reads the colour.
    expect(files).toContain(VARIABLES);
    expect(files).toContain('.storybook/story-frame.scss');
    expect(files).toContain(reader);
    expect(readFileSync(reader, 'utf8')).toMatch(new RegExp(String.raw`\$${colour}\b`));

    const offending = files
      .filter((file) => file !== VARIABLES)
      .flatMap((file) => {
        const text = readFileSync(file, 'utf8');
        return [...text.matchAll(handWritten(colour))].map(
          (match) => `${file}:${text.slice(0, match.index).split('\n').length}`,
        );
      });
    expect(offending).toEqual([]);
  });

  it(`is the value 1px solid $${colour}`, () => {
    const css = compileString(
      `@use 'variables' as v;
      .token { border: v.$${token}; }
      .by-hand { border: 1px solid v.$${colour}; }`,
      { style: 'expanded', loadPaths: [fromRoot('src/scss')] },
    ).css;
    const border = (selector: string) =>
      new RegExp(`\\.${selector} \\{\\s*border: ([^;]+);`).exec(css)?.[1];

    expect(border('by-hand')).toBeDefined();
    expect(border('token')).toBe(border('by-hand'));
  });
});
