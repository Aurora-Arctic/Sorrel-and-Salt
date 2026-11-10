import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import type { Session } from '@/lib/session';
import type { PageRequest } from '@/lib/types';
import { searchHelp } from '@/modules/help';
import { assertCurator } from '@/modules/identity';
import { B, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertHelpArticle } from '../../../support/db/insert-help-article';

// A question typed as a sentence: any of its words may find a row, a row holding more of them ranks higher, a weak match
// is left out, and a keeper's search terms find a row as its own words do. help-search.test.ts holds the keyword cases.
// No question here holds "testwort", which every fixture title does.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const PAGE: PageRequest = { limit: 101, inverted: false };

const slugsFor = async (session: Session | null, query: string) =>
  (await searchHelp(session, query, PAGE)).map((entry) => entry.node.slug);

/** Whether the row's indexed words hold `words` (every one), as a full-text match would read them. */
const holds = async (slug: string, words: string) => {
  const [row] = await sql`
    select search_vector @@ plainto_tsquery('english', ${words}) as holds
    from help_articles where slug = ${slug}`;
  return row.holds as boolean;
};

beforeEach(async () => {
  await sql`truncate help_articles cascade`;
});

describe('a question matching some of a row’s words', () => {
  beforeEach(async () => {
    await insertHelpArticle(
      sql,
      { title: 'Add a Moonwick', slug: 'add-a-moonwick', body: 'Steps for the fixture.' },
      E.id,
    );
    await insertHelpArticle(
      sql,
      { title: 'Testwort Hearth Notes', slug: 'testwort-hearth-notes', body: 'Fixture notes.' },
      E.id,
    );
  });

  it('finds the row although the question holds a word the row does not', async () => {
    // Precondition: "create" is in no row, so a search needing every word answers nothing.
    expect(await holds('add-a-moonwick', 'create')).toBe(false);
    expect(await holds('add-a-moonwick', 'moonwick')).toBe(true);

    expect((await slugsFor(null, 'How do I create a moonwick?'))[0]).toBe('add-a-moonwick');
  });

  it('finds a row by a word in its body alone, among words no row holds', async () => {
    await insertHelpArticle(
      sql,
      {
        title: 'Testwort Ledger',
        slug: 'testwort-ledger',
        body: 'Where the fixture keeps its sablethorn.',
      },
      E.id,
    );

    expect(await slugsFor(null, 'where do I store sablethorn overnight')).toContain(
      'testwort-ledger',
    );
  });
});

describe('ranking and the minimum score', () => {
  const QUESTION = 'How do I graft a brackenrue cutting to rootstock?';

  beforeEach(async () => {
    // Every word of the question, once each.
    await insertHelpArticle(
      sql,
      {
        title: 'Graft a Brackenrue Cutting to Rootstock',
        slug: 'graft-a-brackenrue-cutting-to-rootstock',
        body: 'How the fixture takes.',
      },
      E.id,
    );
    // Two of the four words, in the title and over and over in the body, so a rank that counts occurrences alone favours it.
    await insertHelpArticle(
      sql,
      {
        title: 'Brackenrue Cuttings',
        slug: 'brackenrue-cuttings',
        body: 'Brackenrue cuttings, brackenrue cuttings, and more brackenrue cuttings, cut from brackenrue.',
      },
      E.id,
    );
    // One of the four words, once, deep in a body about something else.
    await insertHelpArticle(
      sql,
      {
        title: 'Testwort Emberlisk Ledger',
        slug: 'testwort-emberlisk-ledger',
        body: 'A long fixture ledger of many emberlisk matters: the kettles, the shelves, the jars, the labels, the lamps, and at the very end a word on rootstock.',
      },
      E.id,
    );
  });

  it('ranks a row matching every word above one matching only some', async () => {
    // Preconditions: the full row holds every word, the partial row two of them and not the others.
    expect(
      await holds('graft-a-brackenrue-cutting-to-rootstock', 'graft brackenrue cutting rootstock'),
    ).toBe(true);
    expect(await holds('brackenrue-cuttings', 'brackenrue cutting')).toBe(true);
    expect(await holds('brackenrue-cuttings', 'graft')).toBe(false);
    expect(await holds('brackenrue-cuttings', 'rootstock')).toBe(false);

    const slugs = await slugsFor(null, QUESTION);

    expect(slugs[0]).toBe('graft-a-brackenrue-cutting-to-rootstock');
    expect(slugs).toContain('brackenrue-cuttings');
    expect(slugs.indexOf('graft-a-brackenrue-cutting-to-rootstock')).toBeLessThan(
      slugs.indexOf('brackenrue-cuttings'),
    );
  });

  it('leaves out a weak match: one word of the question, once, in a body alone', async () => {
    // Preconditions: the row is readable and found by a word of its own, and it holds a word of the question, so a
    // search answering every row with any word would answer it.
    expect(await slugsFor(null, 'emberlisk')).toEqual(['testwort-emberlisk-ledger']);
    expect(await holds('testwort-emberlisk-ledger', 'rootstock')).toBe(true);

    const slugs = await slugsFor(null, QUESTION);

    expect(slugs).not.toContain('testwort-emberlisk-ledger');
    // The bar is not every word: the row holding two of the four is kept.
    expect(slugs).toContain('brackenrue-cuttings');
  });

  it('still answers a one-word search found only in a body', async () => {
    // A single-word search's every match holds all its words, so the minimum score keeps it.
    expect(await slugsFor(null, 'kettles')).toEqual(['testwort-emberlisk-ledger']);
  });
});

describe('a row’s search terms', () => {
  beforeEach(async () => {
    await insertHelpArticle(
      sql,
      {
        title: 'The Gallowmint Flag',
        slug: 'the-gallowmint-flag',
        body: 'What the fixture flag marks.',
        search_terms: 'venomous, deadly',
      },
      E.id,
    );
    await insertHelpArticle(
      sql,
      { title: 'Testwort Shelf Notes', slug: 'testwort-shelf-notes', body: 'Fixture shelves.' },
      E.id,
    );
  });

  it('finds the row by a word only its search terms hold', async () => {
    // Precondition: neither the title, the summary nor the body says "venomous".
    const [row] = await sql`
      select to_tsvector('english', title || ' ' || coalesce(summary, '') || ' ' || body)
        @@ plainto_tsquery('english', 'venomous') as said
      from help_articles where slug = 'the-gallowmint-flag'`;
    expect(row.said).toBe(false);

    expect((await slugsFor(null, 'what does venomous mean on a gallowmint'))[0]).toBe(
      'the-gallowmint-flag',
    );
    expect(await slugsFor(null, 'venomous')).toEqual(['the-gallowmint-flag']);
  });

  it('indexes the search terms at weight B, beside the summary', async () => {
    const [row] = await sql`
      select ts_filter(search_vector, '{b}') @@ to_tsquery('english', 'venomous') as at_b,
             ts_filter(search_vector, '{a,c,d}') @@ to_tsquery('english', 'venomous') as elsewhere
      from help_articles where slug = 'the-gallowmint-flag'`;

    expect(row).toEqual({ at_b: true, elsewhere: false });
  });

  it('reindexes the row when its search terms change', async () => {
    await sql`update help_articles set search_terms = 'baneful' where slug = 'the-gallowmint-flag'`;

    expect(await slugsFor(null, 'baneful')).toEqual(['the-gallowmint-flag']);
    expect(await slugsFor(null, 'venomous')).toEqual([]);
  });
});

describe('the typo fallback', () => {
  beforeEach(async () => {
    await insertHelpArticle(
      sql,
      { title: 'Testwort Quillfeather Queue', slug: 'testwort-quillfeather-queue' },
      E.id,
    );
    await insertHelpArticle(
      sql,
      {
        title: 'Testwort Hearth Notes',
        slug: 'testwort-hearth-notes',
        body: 'Fixture notes.',
        search_terms: 'kindling',
      },
      E.id,
    );
  });

  it('answers a misspelt title word when no row holds any word of the query', async () => {
    // Precondition: no row's words hold the typo, so only the title likeness can answer it.
    const [row] =
      await sql`select count(*)::int as count from help_articles where search_vector @@ plainto_tsquery('english', 'quilfeather')`;
    expect(row.count).toBe(0);

    expect(await slugsFor(null, 'quilfeather')).toContain('testwort-quillfeather-queue');
  });
});

describe('the reader scope on every arm', () => {
  // Each pair: a row only a wider reader may see, and the question that finds it by its body or its search terms
  // alongside a word no row holds, so only the any-word match can answer it.
  const STAFF_BODY = 'where is the duskfern backlog kept today';
  const STAFF_TERMS = 'what does hollowbriar cover';
  const HIDDEN_BODY = 'how do I find wispfern seeds';
  const HIDDEN_TERMS = 'when is glimmerroot needed';
  const CHILD_TERMS = 'what is a fernquill for';

  beforeEach(async () => {
    await insertHelpArticle(
      sql,
      {
        title: 'Testwort Staff Ledger',
        slug: 'testwort-staff-ledger',
        audience: 'staff',
        body: 'The duskfern backlog is worked here.',
      },
      E.id,
    );
    await insertHelpArticle(
      sql,
      {
        title: 'Testwort Staff Notes',
        slug: 'testwort-staff-notes',
        audience: 'staff',
        search_terms: 'hollowbriar',
      },
      E.id,
    );
    await insertHelpArticle(
      sql,
      {
        title: 'Testwort Hidden Ledger',
        slug: 'testwort-hidden-ledger',
        body: 'Where the wispfern seeds are kept.',
        shown: false,
      },
      E.id,
    );
    await insertHelpArticle(
      sql,
      {
        title: 'Testwort Hidden Notes',
        slug: 'testwort-hidden-notes',
        search_terms: 'glimmerroot',
        shown: false,
      },
      E.id,
    );
    const parent = await insertHelpArticle(
      sql,
      { title: 'Testwort Hidden Guide', slug: 'testwort-hidden-guide', shown: false },
      E.id,
    );
    await insertHelpArticle(
      sql,
      {
        title: 'Testwort Child Page',
        slug: 'testwort-child-page',
        parent_id: parent,
        search_terms: 'fernquill',
      },
      E.id,
    );
  });

  it('keeps a staff row found by its body words from a signed-out visitor and a practitioner, and gives it to a curator', async () => {
    // Preconditions: F passes the curator check, B holds no site role, and the curator's same question finds the row.
    expect(assertCurator(asUser(F))).toEqual({ userId: F.id });
    expect(asUser(B).role).toBe('user');
    expect(await slugsFor(asUser(F), STAFF_BODY)).toContain('testwort-staff-ledger');

    expect(await slugsFor(null, STAFF_BODY)).not.toContain('testwort-staff-ledger');
    expect(await slugsFor(asUser(B), STAFF_BODY)).not.toContain('testwort-staff-ledger');
  });

  it('keeps a staff row found by its search terms from a signed-out visitor and a practitioner, and gives it to a curator', async () => {
    expect(await slugsFor(asUser(F), STAFF_TERMS)).toContain('testwort-staff-notes');

    expect(await slugsFor(null, STAFF_TERMS)).not.toContain('testwort-staff-notes');
    expect(await slugsFor(asUser(B), STAFF_TERMS)).not.toContain('testwort-staff-notes');
  });

  it.each([
    ['its body words', HIDDEN_BODY, 'testwort-hidden-ledger'],
    ['its search terms', HIDDEN_TERMS, 'testwort-hidden-notes'],
  ])(
    'never answers a hidden row by %s, to a keeper either, and answers it once shown',
    async (_by, question, slug) => {
      for (const session of [null, asUser(B), asUser(F), asUser(E)]) {
        expect(await slugsFor(session, question)).not.toContain(slug);
      }

      // Precondition: the flag alone kept it out.
      await sql`update help_articles set shown = true where slug = ${slug}`;
      expect(await slugsFor(null, question)).toContain(slug);
    },
  );

  it('never answers a shown child of a hidden parent by its search terms, and answers it once the parent is shown', async () => {
    expect(await slugsFor(null, CHILD_TERMS)).not.toContain('testwort-child-page');
    expect(await slugsFor(asUser(E), CHILD_TERMS)).not.toContain('testwort-child-page');

    await sql`update help_articles set shown = true where slug = 'testwort-hidden-guide'`;
    expect(await slugsFor(null, CHILD_TERMS)).toContain('testwort-child-page');
  });

  it('lets a hidden row matching every word not crowd a shown row’s partial match out', async () => {
    // A hidden row holding every word scores far above a shown row holding one; the shown row must still be answered.
    await insertHelpArticle(
      sql,
      {
        title: 'Rimewort Lantern Mending',
        slug: 'rimewort-lantern-mending',
        search_terms: 'rimewort lantern mending',
        shown: false,
      },
      E.id,
    );
    await insertHelpArticle(sql, { title: 'Rimewort', slug: 'rimewort-guide' }, E.id);
    expect(await holds('rimewort-lantern-mending', 'rimewort lantern mending')).toBe(true);

    expect((await slugsFor(null, 'rimewort lantern mending'))[0]).toBe('rimewort-guide');
  });

  it('lets a hidden row’s search terms not stop the typo fallback for a shown row', async () => {
    await insertHelpArticle(
      sql,
      {
        title: 'Testwort Hidden Cinder',
        slug: 'testwort-hidden-cinder',
        search_terms: 'cindermoss',
        shown: false,
      },
      E.id,
    );
    await insertHelpArticle(sql, { title: 'Testwort Cindermos', slug: 'testwort-cindermos' }, E.id);
    // Precondition: the hidden row's search terms hold the word in full, and the shown row's words do not.
    expect(await holds('testwort-hidden-cinder', 'cindermoss')).toBe(true);
    expect(await holds('testwort-cindermos', 'cindermoss')).toBe(false);

    expect(await slugsFor(null, 'cindermoss')).toEqual(['testwort-cindermos']);
  });
});
