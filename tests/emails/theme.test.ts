import { describe, expect, it } from 'vitest';
import { compileString } from 'sass';
import { EMAIL_THEMES } from '@/emails/theme';
import { fromRoot } from '../support/paths';
import type { Theme } from './types';

// A mail cannot read the site's CSS custom properties, so src/emails/theme.ts
// carries the hexes by hand. This compiles the site's own theme mixins and
// fails when the two disagree, so a palette change reaches the mail or fails CI.

function compiledTokens(theme: Theme): Record<string, string> {
  const { css } = compileString(`@use 'mixins' as m;\n.t { @include m.theme-${theme}; }`, {
    loadPaths: [fromRoot('src/scss')],
  });
  return Object.fromEntries(
    [...css.matchAll(/--([a-z-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]),
  );
}

/** `#rrggbb` for Sass's `#rrggbb` or its `rgb(p%, p%, p%)`, rounded as a browser would. */
function hex(value: string): string {
  if (value.startsWith('#')) return value.toLowerCase();
  const channels = value.match(/[\d.]+%/g);
  if (!channels) throw new Error(`not a colour: ${value}`);
  return `#${channels
    .map((channel) =>
      Math.round(parseFloat(channel) * 2.55)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

describe('EMAIL_THEMES', () => {
  it.each(['dark', 'light'] as const)('matches the site theme-%s mixin', (theme) => {
    const tokens = compiledTokens(theme);
    // Precondition: the compile produced the tokens, so an empty map cannot pass.
    expect(tokens['surface-page']).toBeDefined();

    expect(EMAIL_THEMES[theme]).toEqual({
      page: hex(tokens['surface-page']),
      text: hex(tokens['text-primary']),
      muted: hex(tokens['text-muted']),
      accent: hex(tokens['accent']),
      // The label on a solid fill is the page surface, as on the site.
      onAccent: hex(tokens['surface-page']),
      ornament: {
        blend: theme === 'dark' ? 'screen' : 'multiply',
        opacity: Number(tokens[theme === 'dark' ? 'ornament-screen' : 'ornament-multiply']),
      },
    });
  });
});
