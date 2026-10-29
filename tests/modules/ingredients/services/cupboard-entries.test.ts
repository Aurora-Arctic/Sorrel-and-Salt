import { describe, expect, it } from 'vitest';
import { applyCupboardEntry } from '@/modules/ingredients';
import type { CupboardEntryRow, IngredientRow } from '@/modules/ingredients';
import { entryDetail } from '../../../support/entry-detail';

// `applyCupboardEntry`: a coven's cupboard entry laid over the compendium entry it names. Per column, a null override is the compendium's value, a set one the coven's, and an empty list a list cleared on purpose.
// Everything else is the compendium's, whatever the row says.

const STAMPS = {
  createdAt: new Date('2026-02-01T00:00:00Z'),
  createdBy: '00000000-0000-4000-8000-0000000000bb',
  updatedAt: new Date('2026-02-01T00:00:00Z'),
  updatedBy: '00000000-0000-4000-8000-0000000000bb',
  deletedAt: null,
  deletedBy: null,
};

/** The compendium's Testwort, every overridable column set. */
const COMPENDIUM: IngredientRow = entryDetail({
  description: 'The compendium’s fixture herb.',
  safetyNotes: 'The compendium’s caution.',
  elements: ['fire'],
  celestialBodies: ['Fixture Moon'],
  zodiacSigns: ['Fixture Ram'],
  colors: ['Fixture Green'],
  toxic: true,
}).entry;

/** A row naming COMPENDIUM in coven W, every override null unless given. */
function cupboardEntry(overrides: Partial<CupboardEntryRow> = {}): CupboardEntryRow {
  return {
    id: '00000000-0000-4000-8000-000000000101',
    workspaceId: '00000000-0000-4000-8000-000000000201',
    ingredientId: COMPENDIUM.id,
    label: null,
    description: null,
    safetyNotes: null,
    elements: null,
    celestialBodies: null,
    zodiacSigns: null,
    colors: null,
    ...STAMPS,
    ...overrides,
  };
}

/** Each override, the column of the compendium row it stands over, and a set value. */
const COLUMNS = [
  { override: 'label', column: 'name', set: 'Hedgewort' },
  { override: 'description', column: 'description', set: 'Our own words.' },
  { override: 'safetyNotes', column: 'safetyNotes', set: 'Our own caution.' },
  { override: 'elements', column: 'elements', set: ['water'] },
  { override: 'celestialBodies', column: 'celestialBodies', set: ['Fixture Sun'] },
  { override: 'zodiacSigns', column: 'zodiacSigns', set: ['Fixture Fish'] },
  { override: 'colors', column: 'colors', set: ['Fixture Blue'] },
] as const;

const LISTS = COLUMNS.filter(({ set }) => Array.isArray(set));

describe('applyCupboardEntry', () => {
  it('answers the compendium row unchanged with no cupboard entry', () => {
    expect(applyCupboardEntry(COMPENDIUM, null)).toEqual(COMPENDIUM);
    expect(applyCupboardEntry(COMPENDIUM, undefined)).toEqual(COMPENDIUM);
  });

  // One case per rule, each over every column at once: the merge is one line
  // per column, so a single row of each would leave the other lines unread.
  it("reads the compendium's columns while every override is null", () => {
    expect(applyCupboardEntry(COMPENDIUM, cupboardEntry())).toEqual(COMPENDIUM);
  });

  it("reads the coven's overrides over the compendium's columns once set", () => {
    const overrides = Object.fromEntries(COLUMNS.map(({ override, set }) => [override, set]));
    const merged = applyCupboardEntry(COMPENDIUM, cupboardEntry(overrides));

    for (const { column, set } of COLUMNS) {
      expect(merged[column]).toEqual(set);
      // Precondition: the compendium said something else.
      expect(COMPENDIUM[column]).not.toEqual(set);
    }
  });

  it('reads an empty list override as cleared, not as the compendium’s', () => {
    const overrides = Object.fromEntries(LISTS.map(({ override }) => [override, []]));
    const merged = applyCupboardEntry(COMPENDIUM, cupboardEntry(overrides));

    for (const { column } of LISTS) {
      expect(merged[column]).toEqual([]);
      expect(COMPENDIUM[column]).not.toEqual([]);
    }
  });

  it('leaves the inherited fields, the tier and the id as the compendium has them', () => {
    const merged = applyCupboardEntry(
      COMPENDIUM,
      cupboardEntry({
        label: 'Hedgewort',
        description: 'Our own words.',
        safetyNotes: 'Our own caution.',
        elements: [],
        celestialBodies: [],
        zodiacSigns: [],
        colors: [],
      }),
    );

    const inherited = Object.fromEntries(
      Object.entries(COMPENDIUM).filter(([key]) => !COLUMNS.some(({ column }) => column === key)),
    );
    expect(merged).toMatchObject(inherited);
    expect(merged).toMatchObject({ id: COMPENDIUM.id, workspaceId: null, toxic: true });
  });
});
