import { describe, expect, it } from 'vitest';
import {
  DESCRIPTION_LENGTH,
  describe as describeText,
  entryDescription,
  noIndexMetadata,
  pageTitle,
  publicPageMetadata,
} from '@/lib/page-metadata';

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

  it('names an absolute canonical without a query, repeats the text in the previews, and leaves the image to the card file', () => {
    const meta = publicPageMetadata('Testwort', 'About it.', '/compendium/ingredients/testwort');
    expect(meta.alternates?.canonical).toBe(
      'https://sorrelandsalt.com/compendium/ingredients/testwort',
    );
    expect(meta.openGraph).toMatchObject({
      description: 'About it.',
      url: 'https://sorrelandsalt.com/compendium/ingredients/testwort',
    });
    expect(meta.twitter).toMatchObject({ card: 'summary_large_image', description: 'About it.' });
    // An `images` key here would replace the image the segment's `opengraph-image` file names.
    expect(meta.openGraph).not.toHaveProperty('images');
    expect(meta.twitter).not.toHaveProperty('images');
  });

  it('gives the front page the site name alone, with the same social tags as any public page', () => {
    const meta = publicPageMetadata('Sorrel & Salt', 'About it.', '/', { absolute: true });
    expect(meta.title).toEqual({ absolute: 'Sorrel & Salt' });
    expect(meta.openGraph).toMatchObject({
      title: 'Sorrel & Salt',
      url: 'https://sorrelandsalt.com/',
    });
    expect(meta.twitter).toMatchObject({ title: 'Sorrel & Salt' });
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
