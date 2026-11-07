import { describe, expect, it } from 'vitest';
import { PUBLIC_ARTICLES } from '@/db/seed/help-content/articles';
import { NotFound } from '@/lib/errors';
import { HELP_QUICK_LINKS, quickLinks } from '@/lib/help-quick-links';
import { slugify } from '@/lib/slugify';

// The help front page's quick links name articles by their shipped titles, which the skeleton draws; each is read at its
// slug from the finder, so a link can only point at an article that exists, and one that stops existing drops out
// (claude-docs/components/help-pages.md).

const row = (slug: string, parentSlug: string | null, audience = 'public', kind = 'article') => ({
  kind,
  audience,
  slug,
  parentSlug,
  title: `Testwort ${slug}`,
  summary: null,
});

describe('HELP_QUICK_LINKS', () => {
  it('names only public articles the shipped help holds, by their shipped titles', () => {
    const shipped = new Set(
      PUBLIC_ARTICLES.filter(
        (article) => article.kind === 'article' && article.audience === 'public',
      ).map((article) => article.title),
    );

    // Why a pass means something: there are links to check, and the seed holds public articles.
    expect(HELP_QUICK_LINKS.length).toBeGreaterThan(0);
    expect(shipped.size).toBeGreaterThan(0);
    expect(HELP_QUICK_LINKS.filter((title) => !shipped.has(title))).toEqual([]);
  });
});

describe('quickLinks', () => {
  it('reads each title at its slug', async () => {
    const read: string[] = [];
    await quickLinks(['Testwort One', 'Testwort & Two'], async (slug) => {
      read.push(slug);
      return row(slug, null);
    });

    expect(read).toEqual([slugify('Testwort One'), slugify('Testwort & Two')]);
  });

  it('links each article the finder answers, at its own address, in the order named', async () => {
    const links = await quickLinks(['Testwort One', 'Testwort Two'], async (slug) =>
      slug === 'testwort-one' ? row(slug, 'testwort-guide') : row(slug, null),
    );

    expect(links.map((link) => link.href)).toEqual([
      '/help/testwort-guide/testwort-one',
      '/help/testwort-two',
    ]);
    expect(links[0].title).toBe('Testwort testwort-one');
  });

  it('drops a slug the finder does not hold', async () => {
    const links = await quickLinks(['Testwort Gone', 'Testwort Two'], async (slug) => {
      if (slug === 'testwort-gone') throw new NotFound('Help article not found');
      return row(slug, null);
    });

    expect(links.map((link) => link.href)).toEqual(['/help/testwort-two']);
  });

  it('drops a row that is not a public article', async () => {
    const links = await quickLinks(
      ['Testwort FAQ', 'Testwort Staff', 'Testwort Two'],
      async (slug) =>
        slug === 'testwort-faq'
          ? row(slug, null, 'public', 'faq')
          : slug === 'testwort-staff'
            ? row(slug, null, 'staff')
            : row(slug, null),
    );

    expect(links.map((link) => link.href)).toEqual(['/help/testwort-two']);
  });

  it('passes on a failure that is not a missing row', async () => {
    await expect(
      quickLinks(['Testwort One'], async () => {
        throw new Error('database down');
      }),
    ).rejects.toThrow('database down');
  });
});
