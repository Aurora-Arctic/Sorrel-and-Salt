import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BODY_FONT, HEADING_FONT } from '@/emails/parts/layout';
import { fromRoot } from '../support/paths';

// Sass cannot import the emails' constants, so this holds the site's stacks to the same fallback lists (claude-docs/email.md, "Type").

const variables = readFileSync(fromRoot('src/scss/_variables.scss'), 'utf8');

/** The list after the brand font and next/font's variable: the part Gmail falls back to. */
function siteFallbacks(token: string): string {
  const match = variables.match(new RegExp(`^\\$${token}:\\s*([^;]*);`, 'm'));
  if (!match) throw new Error(`No $${token} in _variables.scss`);
  return match[1].replace(/\s+/g, ' ').split(',').slice(2).join(',').trim();
}

function emailFallbacks(stack: string): string {
  return stack.split(',').slice(1).join(',').trim();
}

describe('the site font stacks', () => {
  it('share the emails body fallback list', () => {
    expect(siteFallbacks('font-body')).toBe(emailFallbacks(BODY_FONT));
  });

  it('share the emails heading fallback list', () => {
    expect(siteFallbacks('font-heading')).toBe(emailFallbacks(HEADING_FONT));
  });
});
