import { describe, expect, it } from 'vitest';
import { SITE_NAME, SITE_TITLE_NAME, titleTemplate } from '@/lib/site';

describe('the site name', () => {
  // 1Password names a saved login from the title only when the name in it spells out the domain.
  it('is spelled out in full for document titles, and keeps its ampersand everywhere else', () => {
    expect(SITE_TITLE_NAME).toBe('Sorrel and Salt');
    expect(SITE_NAME).toBe('Sorrel & Salt');
  });
});

describe('the title template', () => {
  it("finishes a page's own title with the site's title name, after the one separator", () => {
    expect(titleTemplate()).toBe(`%s | ${SITE_TITLE_NAME}`);
  });

  it('puts each scope between the page and the site, nearest first', () => {
    expect(titleTemplate('Fixture Coven')).toBe(`%s | Fixture Coven | ${SITE_TITLE_NAME}`);
  });
});
