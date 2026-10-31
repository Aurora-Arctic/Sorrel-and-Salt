import { describe, expect, it } from 'vitest';
import { SITE_NAME, titleTemplate } from '@/lib/site';

describe('the title template', () => {
  it("finishes a page's own title with the site's name, after the one separator", () => {
    expect(titleTemplate()).toBe(`%s | ${SITE_NAME}`);
  });

  it('puts each scope between the page and the site, nearest first', () => {
    expect(titleTemplate('Fixture Coven')).toBe(`%s | Fixture Coven | ${SITE_NAME}`);
  });
});
