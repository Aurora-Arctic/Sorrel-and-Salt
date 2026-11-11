import { describe, expect, it } from 'vitest';
import { labelByKey, labelOf } from '@/lib/options';

const OPTIONS = [
  { value: 'testwort', label: 'Testwort Label' },
  { value: 'fenbloom', label: 'Fenbloom Label' },
] as const;

describe('labelOf', () => {
  it('gives the label of the option holding the value', () => {
    expect(labelOf(OPTIONS, 'fenbloom')).toBe('Fenbloom Label');
  });

  it('gives the value itself when no option holds it, so a value added on the server is never shown blank', () => {
    expect(labelOf(OPTIONS, 'marshglim')).toBe('marshglim');
  });
});

const FORMS = [
  { variantId: 'variant-1', label: 'Testwort Dried' },
  { variantId: 'variant-2', label: '' },
] as const;

describe('labelByKey', () => {
  it('gives the label of the option whose named key holds the value', () => {
    expect(labelByKey(FORMS, 'variantId', 'variant-1')).toBe('Testwort Dried');
  });

  it('gives the value itself when no option holds it and no fallback is given', () => {
    expect(labelByKey(FORMS, 'variantId', 'variant-9')).toBe('variant-9');
  });

  it('gives the fallback when no option holds the value', () => {
    expect(labelByKey(FORMS, 'variantId', 'variant-9', '')).toBe('');
    expect(labelByKey(FORMS, 'variantId', 'variant-9', 'Testwort List')).toBe('Testwort List');
  });

  it('gives the fallback for a missing value, as a page with no list behind it has', () => {
    expect(labelByKey(FORMS, 'variantId', undefined, 'Testwort List')).toBe('Testwort List');
  });

  it('keeps an empty label an option holds, rather than falling back', () => {
    expect(labelByKey(FORMS, 'variantId', 'variant-2', 'Testwort List')).toBe('');
  });

  it('takes only a key the options carry', () => {
    // @ts-expect-error -- `id` is not a key of these options.
    labelByKey(FORMS, 'id', 'variant-1');
  });
});
