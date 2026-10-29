import { describe, expect, it } from 'vitest';
import { EMAIL_THEMES } from '@/emails/theme';
import { contrastRatio } from '@/lib/contrast';

// The mail's inks and grounds are copied by hand from the site's tokens because a mail client reads no Sass, so the floor is pinned here: text, quieter text and link at 4.5:1 on the page, the button's label at 4.5:1 on its fill and its edge at 3:1 on the page (WCAG 1.4.11).
// One `it` per theme; how the mail looks is the workshop's (claude-docs/testing/layer-ownership.md, rule 4).

describe.each(['dark', 'light'] as const)('the %s mail theme', (name) => {
  const theme = EMAIL_THEMES[name];

  it('keeps its text, link and button legible on its ground', () => {
    expect(contrastRatio(theme.text, theme.page)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.muted, theme.page)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.accent, theme.page)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.onAccent, theme.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.accent, theme.page)).toBeGreaterThanOrEqual(3);
  });
});
