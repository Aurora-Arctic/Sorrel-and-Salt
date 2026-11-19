import { describe, expect, it } from 'vitest';
import {
  DESCRIPTION_LENGTH,
  describe as describeText,
  entryDescription,
  noIndexMetadata,
  pageTitle,
  publicPageMetadata,
} from '@/lib/page-metadata';
import { SITE_NAME, SITE_ORIGIN, SITE_TITLE_NAME } from '@/lib/site';

describe('page metadata', () => {
  it('keeps a short description whole, on one line', () => {
    expect(describeText('A  plant\nof testing.')).toBe('A plant of testing.');
  });

  it('cuts a long description at a word, within the limit', () => {
    const long = Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ');
    const cut = describeText(long);
    expect(cut.length).toBeLessThanOrEqual(DESCRIPTION_LENGTH);
    expect(cut.endsWith('…')).toBe(true);
    const last = cut.slice(0, -1).split(' ').pop();
    expect(long.split(' ')).toContain(last);
  });

  it('gives an entry with no description a sentence that names it, so two differ', () => {
    const a = entryDescription('Testwort', null);
    const b = entryDescription('Fixturewort', '  ');
    expect(a).toContain('Testwort');
    expect(a).not.toBe(b);
  });

  it('names an absolute canonical without a query, and repeats the text in the previews', () => {
    const meta = publicPageMetadata('Testwort', 'About it.', '/compendium/ingredients/testwort');
    expect(meta.alternates?.canonical).toBe(
      'https://sorrelandsalt.com/compendium/ingredients/testwort',
    );
    expect(meta.openGraph).toMatchObject({
      description: 'About it.',
      url: 'https://sorrelandsalt.com/compendium/ingredients/testwort',
    });
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image', description: 'About it.' });
  });

  // A page's own `openGraph` replaces its parent segment's whole, so the root card reaches a page only if the helper names it.
  it.each([
    ['an indexable page', {}],
    ['a noindex page', { noIndex: true }],
    ['a page that names the site', { absolute: true }],
  ])("names the site's share card, sized and described, on %s", (_, options) => {
    const meta = publicPageMetadata(SITE_NAME, 'About it.', '/about', options);
    const images = [meta.openGraph?.images ?? []].flat();

    expect(images).toHaveLength(1);
    const image = images[0];
    const url = typeof image === 'string' || image instanceof URL ? image : image?.url;
    // Relative or absolute alike: the layout's `metadataBase` makes it absolute.
    expect(new URL(String(url), SITE_ORIGIN).href).toBe(`${SITE_ORIGIN}/opengraph-image`);
    expect(image).toMatchObject({ width: 1200, height: 630, alt: SITE_NAME });
  });

  it("titles a public page's share previews with the site name, ampersand and all", () => {
    const meta = publicPageMetadata('Testwort', 'About it.', '/compendium/ingredients/testwort');
    expect(meta.title).toBe('Testwort');
    expect(meta.openGraph).toMatchObject({
      title: 'Testwort | Sorrel & Salt',
      siteName: 'Sorrel & Salt',
    });
    expect(meta.twitter).toMatchObject({ title: 'Testwort | Sorrel & Salt' });
  });

  it('spells the site name out in an absolute tab title, and keeps the ampersand in the share titles', () => {
    const title = SITE_NAME;
    expect(title).not.toBe(SITE_TITLE_NAME);
    const meta = publicPageMetadata(title, 'About it.', '/', { absolute: true });
    expect(meta.title).toEqual({ absolute: SITE_TITLE_NAME });
    expect(meta.openGraph).toMatchObject({
      title: SITE_NAME,
      siteName: SITE_NAME,
      url: 'https://sorrelandsalt.com/',
    });
    expect(meta.twitter).toMatchObject({ title: SITE_NAME });
  });

  it('keeps a noindex page out of search, and follows its links only when the page says', () => {
    expect(noIndexMetadata('Testwort').robots).toEqual({ index: false });
    expect(noIndexMetadata('Testwort', true).robots).toEqual({ index: false, follow: true });
    expect(noIndexMetadata('Testwort', false).robots).toEqual({ index: false, follow: false });
    expect(noIndexMetadata('Testwort')).not.toHaveProperty('alternates');
  });

  it('gives a signed-in page its title and nothing a crawler or a preview would use', () => {
    expect(pageTitle('Testwort')).toEqual({ title: 'Testwort' });
  });
});
