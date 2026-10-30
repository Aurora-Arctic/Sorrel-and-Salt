import { describe, expect, it } from 'vitest';
import { entryJsonLd, jsonLd, listJsonLd } from '@/lib/json-ld';

const entry = {
  name: 'Testwort',
  canonicalName: 'Fixtura testalis',
  slug: 'testwort',
  description: 'A plant for tests.',
  folkNames: ['Fixture-weed', 'testwort'],
};

describe('JSON-LD', () => {
  it('never lets entry text end the script element', () => {
    const text = jsonLd({ name: '</script><b>' });
    expect(text).not.toContain('<');
    expect(JSON.parse(text).name).toBe('</script><b>');
  });

  it('describes an entry as a term with a trail back to the compendium', () => {
    const data = JSON.parse(entryJsonLd(entry));
    const [term, trail] = data['@graph'];
    expect(data['@context']).toBe('https://schema.org');
    expect(term).toMatchObject({
      '@type': 'DefinedTerm',
      name: 'Testwort',
      url: 'https://sorrelandsalt.com/compendium/ingredients/testwort',
      alternateName: ['Fixtura testalis', 'Fixture-weed'],
    });
    expect(trail.itemListElement.map((item: { item: string }) => item.item)).toEqual([
      'https://sorrelandsalt.com/compendium',
      'https://sorrelandsalt.com/compendium/ingredients/testwort',
    ]);
  });

  it('leaves out names and a description the entry lacks', () => {
    const [term] = JSON.parse(
      entryJsonLd({ ...entry, canonicalName: null, folkNames: [], description: null }),
    )['@graph'];
    expect(term).not.toHaveProperty('alternateName');
    expect(term).not.toHaveProperty('description');
  });

  it('describes the list as a collection of the compendium term set', () => {
    expect(JSON.parse(listJsonLd())).toMatchObject({
      '@type': 'CollectionPage',
      mainEntity: { '@type': 'DefinedTermSet' },
    });
  });
});
