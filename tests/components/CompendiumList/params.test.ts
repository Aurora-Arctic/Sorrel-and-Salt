import { describe, expect, it } from 'vitest';
import { COMPENDIUM_PARAMS } from '@/components/CompendiumList/params';

const mode = COMPENDIUM_PARAMS.entries.categoryMode;

describe('the categoryMode parameter', () => {
  it('reads any, and everything else as all', () => {
    expect(mode.read('any')).toBe('any');
    expect(mode.read('all')).toBe('all');
    expect(mode.read(undefined)).toBe('all');
    expect(mode.read('junk')).toBe('all');
    expect(mode.read(['any', 'all'])).toBe('any');
  });

  it('writes any into the address and all as nothing', () => {
    expect(COMPENDIUM_PARAMS.href('/admin/compendium', { categoryMode: 'any' })).toBe(
      '/admin/compendium?categoryMode=any',
    );
    expect(COMPENDIUM_PARAMS.href('/admin/compendium', { categoryMode: 'all' })).toBe(
      '/admin/compendium',
    );
  });

  it('gives the read a variable for any only', () => {
    expect(mode.variable).toBe('categoryMode');
    expect(mode.toVariable('any')).toBe('any');
    expect(mode.toVariable('all')).toBeUndefined();
  });
});

const PATH = '/admin/compendium';
const entries = COMPENDIUM_PARAMS.entries;

describe('the forms parameter', () => {
  it('reads repeated free text, trimmed, with blanks and repeats dropped', () => {
    expect(entries.forms.read([' Oil ', '', 'Tincture', 'oil'])).toEqual(['Oil', 'Tincture']);
    expect(entries.forms.read('Oil')).toEqual(['Oil']);
    expect(entries.forms.read(undefined)).toEqual([]);
  });

  it('keeps a form no one has curated', () => {
    expect(entries.forms.read('Uncurated Powder')).toEqual(['Uncurated Powder']);
  });

  it('round-trips through the address as repeated parameters', () => {
    const href = COMPENDIUM_PARAMS.href(PATH, { forms: ['Oil', 'Tincture'] });
    expect(href).toBe('/admin/compendium?forms=Oil&forms=Tincture');
    const params = new URL(href, 'http://x').searchParams;
    expect(COMPENDIUM_PARAMS.read({ forms: params.getAll('forms') }).forms).toEqual([
      'Oil',
      'Tincture',
    ]);
  });

  it('is the forms variable, the list itself, and none when empty', () => {
    expect(entries.forms.variable).toBe('forms');
    expect(entries.forms.toVariable(['Oil', 'Tincture'])).toEqual(['Oil', 'Tincture']);
    expect(entries.forms.toVariable([])).toBeUndefined();
  });

  it('no longer reads the old single form parameter', () => {
    expect(COMPENDIUM_PARAMS.read({ form: 'Oil' }).forms).toEqual([]);
  });
});

describe('the deities parameter', () => {
  // Two deities of one name under two traditions, told apart by slug.
  const lookups = {
    deities: new Map([
      ['hecate-greek', 'id-greek'],
      ['hecate-roman', 'id-roman'],
      ['isis-egyptian', 'id-isis'],
    ]),
  };

  it('reads repeated slugs, repeats dropped, in order', () => {
    expect(entries.deities.read(['hecate-roman', 'isis-egyptian', 'hecate-roman'])).toEqual([
      'hecate-roman',
      'isis-egyptian',
    ]);
    expect(entries.deities.read(undefined)).toEqual([]);
  });

  it('writes slugs, never ids', () => {
    expect(COMPENDIUM_PARAMS.href(PATH, { deities: ['hecate-greek', 'hecate-roman'] })).toBe(
      '/admin/compendium?deities=hecate-greek&deities=hecate-roman',
    );
  });

  it('becomes deityIds through the lookup, telling two of one name apart', () => {
    expect(entries.deities.variable).toBe('deityIds');
    expect(entries.deities.toVariable(['hecate-greek'], lookups)).toEqual(['id-greek']);
    expect(entries.deities.toVariable(['hecate-roman'], lookups)).toEqual(['id-roman']);
    expect(entries.deities.toVariable(['hecate-roman', 'hecate-greek'], lookups)).toEqual([
      'id-roman',
      'id-greek',
    ]);
  });

  it('drops a slug no deity holds, and is no filter when none is known', () => {
    expect(entries.deities.toVariable(['gone-greek', 'isis-egyptian'], lookups)).toEqual([
      'id-isis',
    ]);
    expect(entries.deities.toVariable(['gone-greek'], lookups)).toBeUndefined();
    expect(entries.deities.toVariable(['hecate-greek'])).toBeUndefined();
  });
});

describe.each([
  ['zodiac', 'zodiacSigns', ['Aries', 'Black Moon Sign']],
  ['celestialBodies', 'celestialBodies', ['Sun', 'Black Moon']],
] as const)('the %s parameter', (name, variable, values) => {
  const entry = entries[name];

  it('reads repeated names, trimmed, repeats dropped', () => {
    expect(entry.read([` ${values[0]} `, '', values[1], values[0].toLowerCase()])).toEqual([
      values[0],
      values[1],
    ]);
    expect(entry.read(undefined)).toEqual([]);
  });

  it('round-trips through the address as repeated parameters', () => {
    const href = COMPENDIUM_PARAMS.href(PATH, { [name]: [...values] });
    const params = new URL(href, 'http://x').searchParams;
    expect(params.getAll(name)).toEqual([...values]);
    expect(COMPENDIUM_PARAMS.read({ [name]: params.getAll(name) })[name]).toEqual([...values]);
  });

  it('is the vocabulary variable, the list itself, and none when empty', () => {
    expect(entry.variable).toBe(variable);
    expect(entry.toVariable([...values])).toEqual([...values]);
    expect(entry.toVariable([])).toBeUndefined();
  });
});

describe('the toxic parameter', () => {
  const toxic = entries.toxic;

  it('reads the two settings, and anything else as no filter', () => {
    expect(toxic.read('toxic')).toBe('toxic');
    expect(toxic.read('not_toxic')).toBe('not_toxic');
    expect(toxic.read('any')).toBe('');
    expect(toxic.read('junk')).toBe('');
    expect(toxic.read(undefined)).toBe('');
  });

  it('writes the setting into the address and no filter as nothing', () => {
    expect(COMPENDIUM_PARAMS.href(PATH, { toxic: 'not_toxic' })).toBe(
      '/admin/compendium?toxic=not_toxic',
    );
    expect(COMPENDIUM_PARAMS.href(PATH, { toxic: '' })).toBe('/admin/compendium');
  });

  it('is the toxic variable, absent for no filter', () => {
    expect(toxic.variable).toBe('toxic');
    expect(toxic.toVariable('toxic')).toBe('toxic');
    expect(toxic.toVariable('not_toxic')).toBe('not_toxic');
    expect(toxic.toVariable('')).toBeUndefined();
  });
});

describe('the No Form parameter (M12.30)', () => {
  it('reads 1 as on and anything else as off, and writes only the on', () => {
    expect(COMPENDIUM_PARAMS.read({ withoutForms: '1' }).withoutForms).toBe(true);
    expect(COMPENDIUM_PARAMS.read({ withoutForms: 'true' }).withoutForms).toBe(false);
    expect(COMPENDIUM_PARAMS.read({}).withoutForms).toBe(false);
    expect(COMPENDIUM_PARAMS.href('/admin/compendium', { withoutForms: true })).toBe(
      '/admin/compendium?withoutForms=1',
    );
    expect(COMPENDIUM_PARAMS.href('/admin/compendium', { withoutForms: false })).toBe(
      '/admin/compendium',
    );
  });

  it('becomes the query variable only when on', () => {
    const on = COMPENDIUM_PARAMS.variables(COMPENDIUM_PARAMS.read({ withoutForms: '1' }));
    const off = COMPENDIUM_PARAMS.variables(COMPENDIUM_PARAMS.read({}));
    expect(on).toMatchObject({ withoutForms: true });
    expect(off.withoutForms).toBeUndefined();
  });
});

describe('the classification parameter', () => {
  it('has left the table, so the address no longer reads or writes it', () => {
    expect(Object.keys(entries)).not.toContain('nomenclature');
    expect(COMPENDIUM_PARAMS.read({ nomenclature: 'unknown' })).not.toHaveProperty('nomenclature');
    expect(COMPENDIUM_PARAMS.variables(COMPENDIUM_PARAMS.read({}))).not.toHaveProperty(
      'nomenclature',
    );
  });
});

describe('the whole table', () => {
  it('reads an empty address as no filter at all', () => {
    expect(COMPENDIUM_PARAMS.read({})).toEqual({
      query: '',
      forms: [],
      withoutReferences: false,
      withoutForms: false,
      elements: [],
      categories: [],
      categoryMode: 'all',
      deities: [],
      zodiac: [],
      celestialBodies: [],
      toxic: '',
      covens: [],
    });
  });
});

describe('the covens parameter (M12.55)', () => {
  it('reads repeated coven ids, repeats dropped', () => {
    expect(entries.covens.read(['w-id', 'v-id', 'w-id'])).toEqual(['w-id', 'v-id']);
    expect(entries.covens.read(undefined)).toEqual([]);
  });

  it('round-trips through the address as repeated parameters', () => {
    const href = COMPENDIUM_PARAMS.href('/compendium', { covens: ['w-id', 'v-id'] });
    expect(href).toBe('/compendium?covens=w-id&covens=v-id');
    const params = new URL(href, 'http://x').searchParams;
    expect(COMPENDIUM_PARAMS.read({ covens: params.getAll('covens') }).covens).toEqual([
      'w-id',
      'v-id',
    ]);
  });

  it('is the covenIds variable, and none when empty', () => {
    expect(entries.covens.variable).toBe('covenIds');
    expect(entries.covens.toVariable(['w-id'])).toEqual(['w-id']);
    expect(entries.covens.toVariable([])).toBeUndefined();
  });
});
