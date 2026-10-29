import { describe, expect, it } from 'vitest';
import {
  DESCRIPTION_LENGTH,
  describe as describeText,
  entryDescription,
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

  it('names an absolute canonical without a query, and repeats the text in the previews', () => {
    const meta = publicPageMetadata('Testwort', 'About it.', '/compendium/ingredients/testwort');
    expect(meta.alternates?.canonical).toBe(
      'https://sorrelandsalt.com/compendium/ingredients/testwort',
    );
    expect(meta.openGraph).toMatchObject({
      description: 'About it.',
      url: 'https://sorrelandsalt.com/compendium/ingredients/testwort',
    });
    expect(meta.twitter).toMatchObject({ description: 'About it.' });
    expect(meta.openGraph).not.toHaveProperty('images');
  });
});
