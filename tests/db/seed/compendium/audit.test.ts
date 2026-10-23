import { describe, expect, it } from 'vitest';
import {
  auditCompendium,
  flaggedCandidates,
  taxoboxTaxon,
  wikiKey,
} from '@/db/seed/compendium/audit';
import type { RenderableEntryFile } from '@/db/seed/compendium/render-entry';
import type { NameBasis, SeedCitation, SeedCompendiumEntry } from '@/db/seed/types';
import { fileOf, loadedOf, SAMPLEWORT, TESTWORT } from './files-fixture';

// The attribution audit (M14.11): each of its four heuristics on invented
// files, once where it marks a citation and once where it does not. Testwort
// is Fixtura testalis and Samplewort Fixtura exemplaris (compendium-fixture.ts);
// every heading, page and taxon here is invented.

type Citation = SeedCitation<'canonicalName'>;

/** A citation of the fixture herbal under `heading`, with the basis given. */
function under(heading: string, nameBasis: NameBasis = 'unaudited'): Citation {
  return {
    source: 'fixture-herbal',
    locator: `under "${heading}"; p. 3`,
    supports: ['canonicalName'],
    nameBasis,
  };
}

/** `entry` citing only `references`, with its folk names replaced when given, as an approved file. */
function citing(
  entry: SeedCompendiumEntry,
  references: Citation[],
  folkNames?: string[],
): RenderableEntryFile {
  return fileOf(entry, (file) => {
    file.entry.references = references;
    file.entry.variants = [];
    if (folkNames !== undefined) file.entry.folkNames = folkNames;
    else delete file.entry.folkNames;
  });
}

const wiki = (pages: Record<string, string> = {}) =>
  new Map(Object.entries(pages).map(([title, text]) => [wikiKey(title), text]));

/** A Wikipedia article on `title`, registered as a per-entry source. */
const WIKI_SOURCE = {
  'fixture-wikipedia-proofleaf': {
    kind: 'entry' as const,
    title: 'Proofleaf',
    container: 'Wikipedia',
    url: 'https://en.wikipedia.org/w/index.php?title=Proofleaf&oldid=1',
    accessed: '2026-10-11',
  },
};

const wikiCitation = (nameBasis: NameBasis = 'unaudited'): Citation => ({
  source: 'fixture-wikipedia-proofleaf',
  supports: ['canonicalName'],
  nameBasis,
});

const testwortPath = 'ingredients/botanical/testwort-fixtura-testalis.md';

describe('the attribution audit', () => {
  describe('corpus collision', () => {
    it('marks a citation whose heading another file uses for another formal name', () => {
      const report = auditCompendium(
        loadedOf([
          citing(TESTWORT, [under('Proofleaf')]),
          citing(SAMPLEWORT, [under('Samplewort', 'stated')], ['Proofleaf']),
        ]),
        wiki(),
      );
      const candidate = report.candidates.find((found) => found.path === testwortPath);
      expect(candidate).toMatchObject({
        source: 'fixture-herbal',
        headedAs: 'Proofleaf',
        citedOn: ['entry'],
        candidates: ['Fixtura exemplaris'],
      });
      expect(candidate?.heuristics).toContain('collision');
    });

    // The Aspen case: the second file holds the heading only as its name,
    // with no folk name and no citation.
    it("counts another file's name, and an inverted heading as its plain order", () => {
      const report = auditCompendium(
        loadedOf([
          citing(TESTWORT, [under('Wort, Proof')]),
          fileOf(SAMPLEWORT, (file) => {
            file.entry.name = 'Proof Wort';
          }),
        ]),
        wiki(),
      );
      expect(report.candidates.find((found) => found.path === testwortPath)).toMatchObject({
        candidates: ['Fixtura exemplaris'],
        heuristics: expect.arrayContaining(['collision']),
      });
    });

    it('leaves a heading that only one formal name uses', () => {
      const report = auditCompendium(
        loadedOf([citing(TESTWORT, [under('Proofleaf')], ['Proofleaf']), citing(SAMPLEWORT, [])]),
        wiki(),
      );
      const candidate = report.candidates.find((found) => found.path === testwortPath);
      // The precondition: the citation was read, and marked by another heuristic.
      expect(candidate?.heuristics).toEqual(['no-binomial']);
      expect(candidate?.candidates).toEqual([]);
    });

    it('leaves a citation already settled as stated or resolved', () => {
      const report = auditCompendium(
        loadedOf([
          citing(TESTWORT, [under('Proofleaf', 'stated')]),
          citing(SAMPLEWORT, [], ['Proofleaf']),
        ]),
        wiki(),
      );
      expect(report.citations).toBe(0);
      expect(report.candidates).toEqual([]);
    });
  });

  describe('hatnote', () => {
    const hatnote =
      "{{About|the herb ''Fixtura testalis''|the shrub|''Fixtura lignosa''|the vine|''Fixtura scandens''}}\n'''Proofleaf''' is a herb.";

    it("marks a citation whose heading's page names two other taxa in a hatnote", () => {
      const report = auditCompendium(
        loadedOf([citing(TESTWORT, [under('Proofleaf')]), citing(SAMPLEWORT, [])]),
        wiki({ Proofleaf: hatnote }),
      );
      const candidate = report.candidates.find((found) => found.path === testwortPath);
      expect(candidate?.heuristics).toContain('hatnote');
      expect(candidate?.candidates).toEqual(['Fixtura lignosa', 'Fixtura scandens']);
    });

    it('marks a disambiguation page that may refer to two other taxa', () => {
      const page =
        "'''Proofleaf''' may refer to:\n* ''[[Fixtura lignosa]]'', a shrub\n* [[Fixtura scandens]], a vine\n{{disambiguation}}";
      const report = auditCompendium(
        loadedOf([citing(TESTWORT, [under('Proofleaf')]), citing(SAMPLEWORT, [])]),
        wiki({ Proofleaf: page }),
      );
      expect(report.candidates.find((found) => found.path === testwortPath)).toMatchObject({
        heuristics: expect.arrayContaining(['hatnote']),
        candidates: ['Fixtura lignosa', 'Fixtura scandens'],
      });
    });

    it("leaves a hatnote naming only one taxon besides the entry's, and a page with none", () => {
      const one = "{{About|the herb ''Fixtura testalis''|the shrub|''Fixtura lignosa''}}";
      for (const page of [one, "'''Proofleaf''' is a herb of ''Fixtura''."]) {
        const report = auditCompendium(
          loadedOf([citing(TESTWORT, [under('Proofleaf')]), citing(SAMPLEWORT, [])]),
          wiki({ Proofleaf: page }),
        );
        const candidate = report.candidates.find((found) => found.path === testwortPath);
        expect(candidate?.heuristics, page).toEqual(['no-binomial']);
      }
    });
  });

  describe('no binomial', () => {
    it('marks a common-name heading on a citation not yet stated or resolved', () => {
      for (const nameBasis of ['unaudited', 'unresolved'] as const) {
        const report = auditCompendium(
          loadedOf([citing(TESTWORT, [under('Proofleaf', nameBasis)]), citing(SAMPLEWORT, [])]),
          wiki(),
        );
        expect(
          report.candidates.find((found) => found.path === testwortPath)?.heuristics,
          nameBasis,
        ).toEqual(['no-binomial']);
      }
    });

    it('marks a citation whose locator names no heading, under the work’s title', () => {
      const report = auditCompendium(
        loadedOf([
          citing(TESTWORT, [
            {
              source: 'fixture-herbal',
              locator: 'p. 12',
              supports: ['canonicalName'],
              nameBasis: 'unaudited',
            },
          ]),
          citing(SAMPLEWORT, []),
        ]),
        wiki(),
      );
      expect(report.candidates.find((found) => found.path === testwortPath)).toMatchObject({
        headedAs: 'A Fixture Herbal',
        heuristics: ['no-binomial'],
      });
    });

    it('leaves a heading that prints a taxon name, and a stated citation', () => {
      const report = auditCompendium(
        loadedOf([
          citing(TESTWORT, [under('Fixtura testalis'), under('Proofleaf', 'stated')]),
          citing(SAMPLEWORT, []),
        ]),
        wiki(),
      );
      // The precondition: the unaudited citation was checked.
      expect(report.citations).toBe(1);
      expect(report.candidates).toEqual([]);
    });
  });

  describe('own taxon', () => {
    const speciesbox = '{{Speciesbox\n| genus = Fixtura\n| species = testalis\n}}\nText.';
    const automatic = "{{Automatic taxobox\n|taxon = ''Fixtura testalis''\n}}\nText.";

    it("reports a Wikipedia citation whose taxobox names the entry's formal name as stated", () => {
      for (const page of [speciesbox, automatic]) {
        const report = auditCompendium(
          loadedOf([citing(TESTWORT, [wikiCitation()]), citing(SAMPLEWORT, [])], WIKI_SOURCE),
          wiki({ Proofleaf: page }),
        );
        expect(report.stated, page).toEqual([
          {
            path: testwortPath,
            source: 'fixture-wikipedia-proofleaf',
            citedOn: ['entry'],
            taxon: 'Fixtura testalis',
          },
        ]);
        // Stated wins over the common-name title it would otherwise be doubted for.
        expect(report.candidates, page).toEqual([]);
      }
    });

    it('leaves an article whose taxobox names another taxon, which stays a candidate', () => {
      const report = auditCompendium(
        loadedOf([citing(TESTWORT, [wikiCitation()]), citing(SAMPLEWORT, [])], WIKI_SOURCE),
        wiki({ Proofleaf: '{{Speciesbox\n| genus = Fixtura\n| species = lignosa\n}}' }),
      );
      expect(report.stated).toEqual([]);
      expect(report.candidates.map((found) => found.source)).toEqual([
        'fixture-wikipedia-proofleaf',
      ]);
    });
  });

  describe('the report', () => {
    it('ranks by score, and names one candidate per source and heading on a file', () => {
      const report = auditCompendium(
        loadedOf([
          fileOf(TESTWORT, (file) => {
            file.entry.references = [under('Proofleaf')];
            delete file.entry.folkNames;
            for (const variant of file.entry.variants) {
              variant.references = [{ ...under('Proofleaf'), supports: ['form'] }];
            }
          }),
          citing(SAMPLEWORT, [under('Mockleaf')], ['Proofleaf']),
        ]),
        wiki(),
      );
      expect(report.candidates.map((found) => [found.path, found.headedAs])).toEqual([
        [testwortPath, 'Proofleaf'],
        ['ingredients/botanical/samplewort-fixtura-exemplaris.md', 'Mockleaf'],
      ]);
      expect(report.candidates[0]?.citedOn).toEqual(['entry', 'Herb', 'Oil']);
      expect(report.candidates[0]!.score).toBeGreaterThan(report.candidates[1]!.score);
    });

    it('flags for --apply only a candidate naming another formal name, unless asked for all', () => {
      const report = auditCompendium(
        loadedOf([
          citing(TESTWORT, [under('Proofleaf')]),
          citing(SAMPLEWORT, [under('Mockleaf')], ['Proofleaf']),
        ]),
        wiki(),
      );
      expect(report.candidates).toHaveLength(2);
      expect(flaggedCandidates(report).map((found) => found.path)).toEqual([testwortPath]);
      expect(flaggedCandidates(report, { includeUnnamed: true })).toHaveLength(2);
    });
  });
});

describe('taxoboxTaxon', () => {
  it('reads a taxobox whose template name is spelled with an underscore', () => {
    expect(taxoboxTaxon("{{Automatic_taxobox\n|taxon = ''Fixtura''\n}}")).toBe('Fixtura');
  });

  it('drops a Wikipedia disambiguator from the genus and from the taxon', () => {
    expect(taxoboxTaxon('{{Speciesbox\n| genus = Fixtura (plant)\n| species = testalis\n}}')).toBe(
      'Fixtura testalis',
    );
    expect(taxoboxTaxon('{{Automatic taxobox\n|taxon = Fixtura (alga) testalis\n}}')).toBe(
      'Fixtura testalis',
    );
  });
});
