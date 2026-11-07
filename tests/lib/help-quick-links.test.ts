import { describe, expect, it } from 'vitest';
import { PUBLIC_ARTICLES } from '@/db/seed/help-content/articles';
import { NotFound } from '@/lib/errors';
import { HELP_QUICK_LINKS, quickLinks } from '@/lib/help-quick-links';
import { slugify } from '@/lib/slugify';

// The help front page's quick links name articles by slug; their titles are read from the finder, so a link can only
// point at an article that exists, and one that stops existing drops out (claude-docs/components/help-pages.md).

const row = (slug: string, parentSlug: string | null, audience = 'public', kind = 'article') => ({
  kind,
  audience,
  slug,
  parentSlug,
  title: `Testwort ${slug}`,
  summary: null,
});

describe('HELP_QUICK_LINKS', () => {
  it('names only public articles the shipped help holds', () => {
    const shipped = new Set(
      PUBLIC_ARTICLES.filter(
        (article) => article.kind === 'article' && article.audience === 'public',
      ).map((article) => slugify(article.title)),
    );

    // Why a pass means something: there are links to check, and the seed holds public articles.
    expect(HELP_QUICK_LINKS.length).toBeGreaterThan(0);
    expect(shipped.size).toBeGreaterThan(0);
    expect(HELP_QUICK_LINKS.filter((slug) => !shipped.has(slug))).toEqual([]);
  });
});

describe('quickLinks', () => {
  it('links each article the finder answers, at its own address, in the order named', async () => {
    const links = await quickLinks(['testwort-one', 'testwort-two'], async (slug) =>
      slug === 'testwort-one' ? row(slug, 'testwort-guide') : row(slug, null),
    );

    expect(links.map((link) => link.href)).toEqual([
      '/help/testwort-guide/testwort-one',
      '/help/testwort-two',
    ]);
    expect(links[0].title).toBe('Testwort testwort-one');
  });

  it('drops a slug the finder does not hold', async () => {
    const links = await quickLinks(['testwort-gone', 'testwort-two'], async (slug) => {
      if (slug === 'testwort-gone') throw new NotFound('Help article not found');
      return row(slug, null);
    });

    expect(links.map((link) => link.href)).toEqual(['/help/testwort-two']);
  });

  it('drops a row that is not a public article', async () => {
    const links = await quickLinks(
      ['testwort-faq', 'testwort-staff', 'testwort-two'],
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
      quickLinks(['testwort-one'], async () => {
        throw new Error('database down');
      }),
    ).rejects.toThrow('database down');
  });
});
