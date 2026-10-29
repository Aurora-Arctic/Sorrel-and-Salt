import { describe, expect, it, vi } from 'vitest';
import sitemap from '@/app/sitemap';

// The sitemap is the list page and one address per current entry, all
// absolute, each dated by when the entry last really changed.

const lastModified = new Date('2026-03-04T05:06:07Z');
vi.mock('@/modules/ingredients', () => ({
  listCompendiumSlugs: vi.fn(async () => [
    { slug: 'testwort', name: 'Testwort', canonicalName: null, lastModified },
    { slug: 'fixtura-testalis', name: 'Fixture', canonicalName: 'Fixtura testalis', lastModified },
  ]),
}));

describe('MB.84: sitemap', () => {
  it('lists the home page, the compendium, sign-in and one absolute address per current entry, dated by its last change', async () => {
    expect(await sitemap()).toEqual([
      { url: 'https://sorrelandsalt.com/' },
      { url: 'https://sorrelandsalt.com/compendium' },
      { url: 'https://sorrelandsalt.com/sign-in' },
      { url: 'https://sorrelandsalt.com/compendium/ingredients/testwort', lastModified },
      { url: 'https://sorrelandsalt.com/compendium/ingredients/fixtura-testalis', lastModified },
    ]);
  });
});
