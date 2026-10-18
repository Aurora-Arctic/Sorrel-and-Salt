import { describe, expect, it } from 'vitest';
import { entryDetail } from '../../support/entry-detail';
import { pageTitleOf } from '@/components/IngredientEntry/page-title';

const entry = entryDetail().entry;
const withFormal = (canonicalName: string | null) => ({ ...entry, canonicalName });

describe('the entry page title', () => {
  it('adds the formal name in brackets after the name', () => {
    expect(pageTitleOf(entry)).toBe(`${entry.name} (${entry.canonicalName})`);
  });

  it('is the name alone when the entry has no formal name', () => {
    expect(pageTitleOf(withFormal(null))).toBe(entry.name);
  });

  it('is the name alone when the formal name is the name, whatever its case', () => {
    expect(pageTitleOf(withFormal(entry.name.toUpperCase()))).toBe(entry.name);
  });
});
