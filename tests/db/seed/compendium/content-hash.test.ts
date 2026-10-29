import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  canonicalEntry,
  contentHash,
  HASH_VERSION,
  hashText,
  stableJson,
} from '@/db/seed/compendium/content-hash';
import { entryFilePath, parseEntryFile } from '@/db/seed/compendium/parse-entry';
import { renderEntryFile } from '@/db/seed/compendium/render-entry';
import { fileOf, TESTWORT } from './files-fixture';
import type { SeedCompendiumEntry } from '@/db/seed/types';

// The content hash tells a changed file from an unchanged one, so what
// it ignores matters as much as what it sees. Each case below is one edit to
// the invented Testwort; the decision record lists which side each falls on
// (claude-docs/design-decisions/m14.4-compendium-markdown-files.md, "The hash").

/** Testwort with `edit` applied to a deep copy. */
function edited(edit: (entry: SeedCompendiumEntry) => void): SeedCompendiumEntry {
  const entry = structuredClone(TESTWORT);
  edit(entry);
  return entry;
}

const BASE = contentHash(TESTWORT);

describe('contentHash', () => {
  it('is the SHA-256 of the version line and the stable JSON of the canonical entry', () => {
    expect(BASE).toMatch(/^[0-9a-f]{64}$/);
    expect(hashText(TESTWORT).startsWith(`${HASH_VERSION}\n`)).toBe(true);
    expect(BASE).toBe(createHash('sha256').update(hashText(TESTWORT), 'utf8').digest('hex'));
    expect(hashText(TESTWORT)).toBe(`${HASH_VERSION}\n${stableJson(canonicalEntry(TESTWORT))}`);
  });

  describe('does not change when', () => {
    it("the entry's keys are in another order", () => {
      const reversed = Object.fromEntries(
        Object.entries(TESTWORT).reverse(),
      ) as SeedCompendiumEntry;
      expect(contentHash(reversed)).toBe(BASE);
    });

    it('a citation changes what it supports, or its provenance', () => {
      expect(contentHash(edited((e) => (e.references[0].supports = ['description'])))).toBe(BASE);
      expect(
        contentHash(
          edited((e) => {
            e.references[0].nameBasis = 'resolved';
            e.references[0].headedAs = 'Testwort';
            e.references[0].resolvedBy = 'fixture-page';
          }),
        ),
      ).toBe(BASE);
      expect(contentHash(edited((e) => delete e.references[0].nameBasis))).toBe(BASE);
    });

    it('a string is re-wrapped, padded or written in another Unicode form', () => {
      const description = TESTWORT.description as string;
      expect(contentHash(edited((e) => (e.description = `  ${description}  `)))).toBe(BASE);
      expect(contentHash(edited((e) => (e.description = description.replace(' ', '\n'))))).toBe(
        BASE,
      );
      expect(contentHash(edited((e) => (e.description = description.replace(' ', '   '))))).toBe(
        BASE,
      );
      const decomposed = edited((e) => (e.safetyNotes = 'Café note.'));
      const composed = edited((e) => (e.safetyNotes = 'Café note.'));
      expect(contentHash(decomposed)).toBe(contentHash(composed));
    });

    it('an absent list is written empty, or a flag left off is written as undefined', () => {
      expect(contentHash(edited((e) => (e.substitutes = [])))).toBe(BASE);
      expect(contentHash(edited((e) => (e.variants[0].colors = [])))).toBe(BASE);
      expect(contentHash(edited((e) => (e.variants[0].toxic = undefined)))).toBe(BASE);
      expect(contentHash(edited((e) => (e.variants[0].description = null)))).toBe(BASE);
    });

    it("the file's status, seedUpdate, overwriteEditor, questions or edit notes change", () => {
      const path = entryFilePath(TESTWORT);
      const plain = parseEntryFile(path, renderEntryFile(fileOf(TESTWORT)));
      const marked = parseEntryFile(
        path,
        renderEntryFile(
          fileOf(TESTWORT, (file) => {
            file.status = 'needs-review';
            file.seedUpdate = 'b'.repeat(64);
            file.overwriteEditor = true;
            file.sections = { questions: 'Which?', editNotes: 'Later.' };
          }),
        ),
      );
      expect(plain.file?.hash).toBe(BASE);
      expect(marked.file?.hash).toBe(BASE);
    });
  });

  describe('changes when', () => {
    it.each<[string, (entry: SeedCompendiumEntry) => void]>([
      ['the description changes', (e) => (e.description = `${e.description} more`)],
      [
        'a paragraph break is added',
        (e) => (e.description = (e.description as string).replace(' ', '\n\n')),
      ],
      ['the name changes', (e) => (e.name = 'Testwort Proper')],
      ['the formal name changes', (e) => (e.canonicalName = 'Fixtura testalis var. nova')],
      ['a scalar changes', (e) => (e.safetyNotes = 'Another caution.')],
      ['the toxic flag comes off', (e) => delete e.toxic],
      ['a list gains a value', (e) => e.categories?.push('Healing')],
      ['a list is reordered', (e) => e.deities?.reverse()],
      ['a list loses a value', (e) => (e.folkNames = ['Proofleaf'])],
      ['a substitute is added', (e) => (e.substitutes = [{ name: 'Mockroot' }])],
      ['a form is renamed', (e) => (e.variants[0].form = 'Leaf')],
      ['a form gains a description', (e) => (e.variants[0].description = 'Dried.')],
      ['a form is dropped', (e) => e.variants.pop()],
      ["a form's substitute changes", (e) => (e.variants[1].substitutes = [{ name: 'Mockroot' }])],
      ["a citation's source handle changes", (e) => (e.references[0].source = 'fixture-page')],
      ["a citation's locator changes", (e) => (e.references[0].locator = 'p. 13')],
      ["a form's citation changes", (e) => (e.variants[0].references[0].locator = 'p. 99')],
    ])('%s', (_case, edit) => {
      expect(contentHash(edited(edit))).not.toBe(BASE);
    });
  });

  describe('canonicalEntry', () => {
    it("uses the column's names, drops blanks and sorts keys", () => {
      const canonical = canonicalEntry(TESTWORT) as Record<string, unknown>;
      expect(Object.keys(canonical)).toEqual(Object.keys(canonical).sort());
      expect(canonical).toHaveProperty('colors', ['green']);
      expect(canonical).not.toHaveProperty('colours');
      expect(canonical).not.toHaveProperty('substitutes');
      expect(canonical.references).toEqual([{ locator: 'p. 12', source: 'fixture-herbal' }]);
    });
  });
});
