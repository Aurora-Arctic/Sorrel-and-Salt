import { describe, expect, it } from 'vitest';
import { sourcingScore } from '@/modules/ingredients';
import type { CitedReference, SourcingInput } from '@/modules/ingredients';
import type { NameBasis, ReferenceKind } from '@/modules/ingredients/schema/ingredient-enums';

type ReferenceRow = CitedReference['reference'];

let nextId = 0;

function work(kind: ReferenceKind, fields: Partial<ReferenceRow> = {}): ReferenceRow {
  nextId += 1;
  return {
    id: `00000000-0000-4000-8000-${String(nextId).padStart(12, '0')}`,
    workspaceId: null,
    kind,
    authors: null,
    title: `Testwort Herbal ${nextId}`,
    container: null,
    contributors: null,
    edition: null,
    volume: null,
    issue: null,
    series: null,
    place: null,
    publisher: null,
    published: null,
    pages: null,
    host: null,
    url: null,
    modified: null,
    accessed: null,
    note: null,
    scholarly: false,
    seedKey: null,
    createdAt: new Date(0),
    createdBy: null,
    updatedAt: new Date(0),
    updatedBy: null,
    deletedAt: null,
    deletedBy: null,
    ...fields,
  } as ReferenceRow;
}

function cite(
  reference: ReferenceRow,
  fields: {
    locator?: string | null;
    nameBasis?: NameBasis | null;
    supports?: string[] | null;
  } = {},
): CitedReference {
  return { reference, locator: 'p. 1', nameBasis: 'stated', supports: null, ...fields };
}

const settled: SourcingInput['entry'] = {
  workspaceId: null,
  nomenclature: 'botanical',
  reviewed: false,
  safetyNotes: null,
};

function entry(
  fields: Partial<Omit<SourcingInput, 'entry'>> & { entry?: Partial<SourcingInput['entry']> } = {},
): SourcingInput {
  return { references: [], forms: [], ...fields, entry: { ...settled, ...fields.entry } };
}

function fact(input: SourcingInput, name: string) {
  const result = sourcingScore(input);
  if (!result) throw new Error('A compendium entry is scored');
  const found = result.facts.find((each) => each.fact === name);
  if (!found) throw new Error(`The list names ${name}`);
  return found;
}

describe('sourcingScore', () => {
  it('scores no coven ingredient', () => {
    expect(
      sourcingScore(entry({ entry: { workspaceId: '00000000-0000-4000-8000-000000000999' } })),
    ).toBeNull();
  });

  it('lists every fact, zero-point ones too, and the list sums to the score', () => {
    const result = sourcingScore(entry());
    expect(result?.facts.map((each) => each.fact)).toEqual([
      'sources',
      'bestSource',
      'nameBacked',
      'curatorReviewed',
      'nomenclatureUnknown',
      'noLocator',
      'safetyUnsourced',
      'formCitesNothing',
    ]);
    expect(result?.score).toBe(result?.facts.reduce((sum, each) => sum + each.points, 0));
  });

  it('adds 10 per distinct source across the entry and its forms, up to 30', () => {
    const book = work('book');
    expect(fact(entry(), 'sources')).toEqual({ fact: 'sources', label: '0 Sources', points: 0 });
    expect(fact(entry({ references: [cite(book)] }), 'sources')).toMatchObject({
      label: '1 Source',
      points: 10,
    });
    const once = entry({
      references: [cite(book)],
      forms: [{ safetyNotes: null, references: [cite(book)] }],
    });
    expect(fact(once, 'sources').points).toBe(10);
    const four = [work('book'), work('book'), work('book'), work('book')].map((each) => cite(each));
    expect(fact(entry({ references: four }), 'sources')).toMatchObject({
      label: '4 Sources',
      points: 30,
    });
  });

  it('adds the best source tier: scholarly 25, book, chapter or entry 18, article 15, web page 8', () => {
    const best = (...works: ReferenceRow[]) =>
      fact(entry({ references: works.map((each) => cite(each)) }), 'bestSource');
    expect(fact(entry(), 'bestSource')).toMatchObject({ label: 'Best Source: None', points: 0 });
    expect(best(work('web_page'))).toMatchObject({ label: 'Best Source: Web Page', points: 8 });
    expect(best(work('web_page', { url: 'https://en.wikipedia.org/wiki/Testwort' }))).toMatchObject(
      {
        label: 'Best Source: Wikipedia',
        points: 8,
      },
    );
    expect(best(work('web_page'), work('article'))).toMatchObject({
      label: 'Best Source: Article',
      points: 15,
    });
    expect(best(work('article'), work('book'))).toMatchObject({
      label: 'Best Source: Book',
      points: 18,
    });
    expect(best(work('chapter')).points).toBe(18);
    expect(best(work('entry'))).toMatchObject({
      label: 'Best Source: Reference Entry',
      points: 18,
    });
    expect(best(work('book'), work('article', { scholarly: true }))).toMatchObject({
      label: 'Best Source: Scholarly Work',
      points: 25,
    });
  });

  it('adds 15 times the share of citations that back the formal name, and 15 when there is none to back', () => {
    const backed = (...bases: (NameBasis | null)[]) =>
      fact(
        entry({ references: bases.map((nameBasis) => cite(work('book'), { nameBasis })) }),
        'nameBacked',
      );
    expect(backed()).toMatchObject({ label: 'Formal Name Backed: 0 of 0', points: 0 });
    expect(backed('stated', 'resolved', 'stated')).toMatchObject({
      label: 'Formal Name Backed: 3 of 3',
      points: 15,
    });
    expect(backed('stated', 'unresolved')).toMatchObject({
      label: 'Formal Name Backed: 1 of 2',
      points: 8,
    });
    expect(backed('stated', 'unaudited', null)).toMatchObject({
      label: 'Formal Name Backed: 1 of 3',
      points: 5,
    });
    const form = entry({
      references: [cite(work('book'), { nameBasis: 'stated' })],
      forms: [{ safetyNotes: null, references: [cite(work('book'), { nameBasis: 'unaudited' })] }],
    });
    expect(fact(form, 'nameBacked')).toMatchObject({
      label: 'Formal Name Backed: 1 of 2',
      points: 8,
    });
    expect(fact(entry({ entry: { nomenclature: 'none' } }), 'nameBacked')).toMatchObject({
      label: 'Formal Name Backed: No Formal Name to Resolve',
      points: 15,
    });
  });

  it('adds 30 once a curator has reviewed the entry', () => {
    expect(fact(entry(), 'curatorReviewed')).toMatchObject({
      label: 'Curator Review: Not Yet',
      points: 0,
    });
    expect(fact(entry({ entry: { reviewed: true } }), 'curatorReviewed')).toMatchObject({
      label: 'Curator Review: Done',
      points: 30,
    });
  });

  it('takes 10 when the nomenclature is unknown', () => {
    expect(fact(entry(), 'nomenclatureUnknown')).toMatchObject({
      label: 'Nomenclature: Settled',
      points: 0,
    });
    expect(
      fact(entry({ entry: { nomenclature: 'unknown' } }), 'nomenclatureUnknown'),
    ).toMatchObject({
      label: 'Nomenclature: Unknown',
      points: -10,
    });
  });

  it('takes 3 for each print citation with no locator, down to -15, and never for a web page', () => {
    const bare = (count: number, kind: ReferenceKind = 'book') =>
      fact(
        entry({
          references: Array.from({ length: count }, () => cite(work(kind), { locator: null })),
        }),
        'noLocator',
      );
    expect(bare(0)).toMatchObject({ label: 'Citations with No Locator: 0', points: 0 });
    expect(bare(2)).toMatchObject({ label: 'Citations with No Locator: 2', points: -6 });
    expect(bare(1, 'chapter').points).toBe(-3);
    expect(bare(1, 'article').points).toBe(-3);
    expect(bare(1, 'entry').points).toBe(-3);
    expect(bare(1, 'web_page').points).toBe(0);
    expect(bare(6)).toMatchObject({ label: 'Citations with No Locator: 6', points: -15 });
    const onForm = entry({
      forms: [{ safetyNotes: null, references: [cite(work('book'), { locator: null })] }],
    });
    expect(fact(onForm, 'noLocator').points).toBe(-3);
  });

  it('takes 15 once when a safety note on the entry or a form has no citation supporting it', () => {
    expect(fact(entry(), 'safetyUnsourced')).toMatchObject({
      label: 'Safety Note: None',
      points: 0,
    });
    expect(fact(entry({ entry: { safetyNotes: '  ' } }), 'safetyUnsourced').points).toBe(0);
    const unsourced = entry({
      entry: { safetyNotes: 'Not for internal use.' },
      forms: [
        { safetyNotes: 'Irritant.', references: [cite(work('book'), { supports: ['form'] })] },
      ],
    });
    expect(fact(unsourced, 'safetyUnsourced')).toMatchObject({
      label: 'Safety Note: Unsourced',
      points: -15,
    });
    const onForm = entry({ forms: [{ safetyNotes: 'Irritant.', references: [] }] });
    expect(fact(onForm, 'safetyUnsourced').points).toBe(-15);
    const sourced = entry({
      entry: { safetyNotes: 'Not for internal use.' },
      forms: [
        {
          safetyNotes: null,
          references: [cite(work('book'), { supports: ['form', 'safetyNotes'] })],
        },
      ],
    });
    expect(fact(sourced, 'safetyUnsourced')).toMatchObject({
      label: 'Safety Note: Sourced',
      points: 0,
    });
  });

  it('takes 5 for each form citing nothing of its own, down to -15', () => {
    const bare = { safetyNotes: null, references: [] };
    const cited = { safetyNotes: null, references: [cite(work('book'))] };
    expect(fact(entry({ forms: [cited] }), 'formCitesNothing')).toMatchObject({
      label: 'Forms Citing Nothing: 0',
      points: 0,
    });
    expect(fact(entry({ forms: [bare, cited] }), 'formCitesNothing')).toMatchObject({
      label: 'Forms Citing Nothing: 1',
      points: -5,
    });
    expect(fact(entry({ forms: [bare, bare, bare, bare] }), 'formCitesNothing')).toMatchObject({
      label: 'Forms Citing Nothing: 4',
      points: -15,
    });
  });

  describe("the plan's worked examples", () => {
    it('scores two books without a locator and Wikipedia, all stated, not reviewed, at 57', () => {
      const result = sourcingScore(
        entry({
          references: [
            cite(work('book'), { locator: null }),
            cite(work('book'), { locator: null }),
            cite(work('web_page', { url: 'https://en.wikipedia.org/wiki/Testwort' }), {
              locator: null,
            }),
          ],
        }),
      );
      expect(result?.score).toBe(57);
    });

    it('scores one resolved web page, reviewed, at 63', () => {
      const result = sourcingScore(
        entry({
          entry: { reviewed: true },
          references: [cite(work('web_page'), { locator: null, nameBasis: 'resolved' })],
        }),
      );
      expect(result?.score).toBe(63);
    });

    it('scores one unaudited web page, nomenclature unknown and a safety note unsourced, at -7', () => {
      const result = sourcingScore(
        entry({
          entry: { nomenclature: 'unknown', safetyNotes: 'Toxic if eaten.' },
          references: [cite(work('web_page'), { locator: null, nameBasis: 'unaudited' })],
        }),
      );
      expect(result?.score).toBe(-7);
    });
  });
});
