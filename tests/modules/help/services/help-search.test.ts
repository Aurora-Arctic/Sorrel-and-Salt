import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import type { Session } from '@/lib/session';
import type { Cursor, PageCount, PageRequest } from '@/lib/types';
import * as help from '@/modules/help';
import { searchHelp } from '@/modules/help';
import { assertCurator } from '@/modules/identity';
import { B, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertHelpArticle } from '../../../support/db/insert-help-article';

// Search is uncached and takes a session or none: the audience scope is applied in SQL by the staff finder's rules,
// and a signed-in member with no site role searches what a signed-out visitor does.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const PAGE: PageRequest = { limit: 101, inverted: false };

// Read by name until the module exports it, so this file type-checks while the count is missing; a direct import replaces it.
const { countHelpSearch } = help as unknown as {
  countHelpSearch: (
    session: Session | null,
    query: string,
    start: Cursor | undefined,
  ) => Promise<PageCount>;
};

const slugsFor = async (session: Session | null, query: string) =>
  (await searchHelp(session, query, PAGE)).map((entry) => entry.node.slug);

beforeEach(async () => {
  await sql`truncate help_articles cascade`;

  await insertHelpArticle(
    sql,
    {
      title: 'Resetting a Testwort Password',
      slug: 'resetting-a-testwort-password',
      body: 'Steps for the fixture reset.',
    },
    E.id,
  );
  await insertHelpArticle(
    sql,
    {
      title: 'Testwort Account Notes',
      slug: 'testwort-account-notes',
      body: 'Among the fixture notes, one line about a password.',
    },
    E.id,
  );
  await insertHelpArticle(
    sql,
    {
      kind: 'faq',
      title: 'Where Is the Ashgrove Fixture?',
      slug: 'where-is-the-ashgrove-fixture',
      position: 1,
    },
    E.id,
  );
  await insertHelpArticle(
    sql,
    { kind: 'term', title: 'Ashgrove', slug: 'ashgrove', body: 'A fixture word.' },
    E.id,
  );
  await insertHelpArticle(
    sql,
    { title: 'Testwort Ashgrove Primer', slug: 'testwort-ashgrove-primer' },
    E.id,
  );
  await insertHelpArticle(
    sql,
    {
      title: 'Testwort Quillfeather Queue',
      slug: 'testwort-quillfeather-queue',
      audience: 'staff',
    },
    E.id,
  );
  await insertHelpArticle(
    sql,
    {
      title: 'Testwort Lanternmoss Grants',
      slug: 'testwort-lanternmoss-grants',
      audience: 'keeper',
    },
    E.id,
  );
  await insertHelpArticle(
    sql,
    { title: 'Testwort Mirebloom Notes', slug: 'testwort-mirebloom-notes', deleted_at: new Date() },
    E.id,
  );
});

describe('searchHelp', () => {
  it('ranks a title match above a body-only match', async () => {
    expect(await slugsFor(null, 'password')).toEqual([
      'resetting-a-testwort-password',
      'testwort-account-notes',
    ]);
  });

  it('stems English words, so "passwords" finds a body that says "password"', async () => {
    // The body-only row's title has no likeness to the word, so only the stemmed full-text match can find it.
    expect(await slugsFor(null, 'passwords')).toEqual(
      expect.arrayContaining(['testwort-account-notes', 'resetting-a-testwort-password']),
    );
  });

  it('falls back to a title likeness when the full-text match finds nothing', async () => {
    expect(await slugsFor(null, 'pasword')).toContain('resetting-a-testwort-password');
  });

  it('searches FAQ entries, articles and terms alike', async () => {
    const kinds = (await searchHelp(null, 'ashgrove', PAGE)).map((entry) => entry.node.kind);

    expect(new Set(kinds)).toEqual(new Set(['faq', 'article', 'term']));
  });

  it.each(['', '   ', '\t\n'])('answers nothing to the empty query %j', async (query) => {
    // Precondition: there are public rows a query that matched everything would answer.
    expect((await slugsFor(null, 'password')).length).toBeGreaterThan(0);

    expect(await searchHelp(null, query, PAGE)).toEqual([]);
  });

  it('never answers a deleted row, to a keeper either, by its words or a likeness', async () => {
    const [row] =
      await sql`select count(*)::int as count from help_articles where slug = 'testwort-mirebloom-notes'`;
    expect(row.count).toBe(1);

    expect(await slugsFor(asUser(E), 'mirebloom')).toEqual([]);
    expect(await slugsFor(asUser(E), 'mirblom')).toEqual([]);
  });
});

describe('the audience scope', () => {
  it('keeps a staff row’s words from a signed-out visitor and a practitioner, and gives them to a curator', async () => {
    // Preconditions: the staff row is live and found by its word; F passes the curator check, B does not.
    expect(await slugsFor(asUser(E), 'quillfeather')).toEqual(['testwort-quillfeather-queue']);
    expect(assertCurator(asUser(F))).toEqual({ userId: F.id });
    expect(asUser(B).role).toBe('user');

    expect(await slugsFor(null, 'quillfeather')).toEqual([]);
    expect(await slugsFor(asUser(B), 'quillfeather')).toEqual([]);
    expect(await slugsFor(asUser(F), 'quillfeather')).toEqual(['testwort-quillfeather-queue']);
  });

  it('holds the scope in the typo fallback too', async () => {
    expect(await slugsFor(asUser(F), 'quilfeather')).toContain('testwort-quillfeather-queue');

    expect(await slugsFor(null, 'quilfeather')).not.toContain('testwort-quillfeather-queue');
    expect(await slugsFor(asUser(B), 'quilfeather')).not.toContain('testwort-quillfeather-queue');
  });

  it('gives a keeper row’s words to a keeper only', async () => {
    expect(await slugsFor(asUser(E), 'lanternmoss')).toEqual(['testwort-lanternmoss-grants']);

    expect(await slugsFor(asUser(F), 'lanternmoss')).toEqual([]);
    expect(await slugsFor(asUser(B), 'lanternmoss')).toEqual([]);
    expect(await slugsFor(null, 'lanternmoss')).toEqual([]);
    expect(await slugsFor(asUser(F), 'lanternmos')).not.toContain('testwort-lanternmoss-grants');
  });
});

describe('paging a search by its cursor', () => {
  it('walks the results two at a time in the order read whole, with no row twice', async () => {
    // Ties included: two rows score the same, so the order needs a tiebreak to hold across pages.
    for (const [n, body] of [
      ['one', 'brindlemark'],
      ['two', 'brindlemark brindlemark'],
      ['three', 'brindlemark brindlemark brindlemark'],
      ['four', 'brindlemark'],
      ['five', 'brindlemark and more fixture words'],
    ]) {
      await insertHelpArticle(
        sql,
        { title: `Testwort Ledger ${n}`, slug: `testwort-ledger-${n}`, body },
        E.id,
      );
    }
    const whole = (await searchHelp(null, 'brindlemark', PAGE)).map((entry) => entry.node.id);
    expect(whole).toHaveLength(5);

    const walked: string[] = [];
    let after: PageRequest['after'];
    for (let pages = 0; pages < 10; pages += 1) {
      const entries = await searchHelp(null, 'brindlemark', { limit: 2, inverted: false, after });
      if (entries.length === 0) break;
      walked.push(...entries.map((entry) => entry.node.id));
      after = entries[entries.length - 1].cursor;
    }

    expect(walked).toEqual(whole);
    expect(new Set(walked).size).toBe(5);
  });

  describe('among rows of every audience', () => {
    const WORD = 'saltmarsh';
    const HIDDEN = ['testwort-saltmarsh-staff', 'testwort-saltmarsh-keeper'];

    beforeEach(async () => {
      for (const n of ['one', 'two', 'three', 'four', 'five']) {
        await insertHelpArticle(
          sql,
          { title: `Testwort Saltmarsh ${n}`, slug: `testwort-saltmarsh-${n}`, body: WORD },
          E.id,
        );
      }
      await insertHelpArticle(
        sql,
        { title: 'Testwort Saltmarsh Staff Notes', slug: HIDDEN[0], body: WORD, audience: 'staff' },
        E.id,
      );
      await insertHelpArticle(
        sql,
        {
          title: 'Testwort Saltmarsh Keeper Notes',
          slug: HIDDEN[1],
          body: WORD,
          audience: 'keeper',
        },
        E.id,
      );
    });

    // Every entry the reader reaches, two rows at a time, in rank order.
    const walk = async (session: Session | null) => {
      const walked: { slug: string; cursor: Cursor }[] = [];
      let after: PageRequest['after'];
      for (let pages = 0; pages < 10; pages += 1) {
        const entries = await searchHelp(session, WORD, { limit: 2, inverted: false, after });
        if (entries.length === 0) break;
        walked.push(...entries.map((entry) => ({ slug: entry.node.slug, cursor: entry.cursor })));
        after = entries[entries.length - 1].cursor;
      }
      return walked;
    };
    const slugs = async (session: Session | null) => (await walk(session)).map(({ slug }) => slug);

    it('keeps a staff and a keeper row from a signed-out reader on every page, where a keeper walking the same words reaches both', async () => {
      // Precondition: the words find both rows, a page at a time, for a reader their audience admits.
      expect(await slugs(asUser(E))).toEqual(expect.arrayContaining(HIDDEN));

      const walked = await slugs(null);
      expect(walked).toHaveLength(5);
      expect(walked.filter((slug) => HIDDEN.includes(slug))).toEqual([]);
    });

    it('counts a signed-out reader’s matches without the staff and keeper rows, which a keeper’s count holds', async () => {
      // Precondition: the keeper reaches all seven rows, so a count that ignored the audience would answer seven.
      expect(await slugs(asUser(E))).toHaveLength(7);

      expect((await countHelpSearch(asUser(E), WORD, undefined)).totalCount).toBe(7);
      expect((await countHelpSearch(asUser(F), WORD, undefined)).totalCount).toBe(6);
      expect((await countHelpSearch(asUser(B), WORD, undefined)).totalCount).toBe(5);
      expect((await countHelpSearch(null, WORD, undefined)).totalCount).toBe(5);
    });

    it.each([
      ['a signed-out reader', null],
      ['a practitioner', asUser(B)],
      ['a curator', asUser(F)],
      ['a keeper', asUser(E)],
    ])('counts, for %s, the rows a walk of every page reaches', async (_, session) => {
      const walked = await walk(session);
      expect(walked.length).toBeGreaterThan(0);

      expect(await countHelpSearch(session, WORD, undefined)).toEqual({
        totalCount: walked.length,
        countBefore: null,
      });
    });

    it('counts the rows that rank ahead of a page’s first row', async () => {
      for (const session of [null, asUser(E)]) {
        const walked = await walk(session);
        // Precondition: a walk long enough that a row has others ahead of it.
        expect(walked.length).toBeGreaterThan(2);

        const before = await Promise.all(
          walked.map(
            async ({ cursor }) => (await countHelpSearch(session, WORD, cursor)).countBefore,
          ),
        );

        expect(before).toEqual(walked.map((_, index) => index));
      }
    });

    it.each(['', '   '])('counts nothing for the empty query %j', async (query) => {
      // Precondition: the words would find rows.
      expect((await slugs(null)).length).toBeGreaterThan(0);

      expect(await countHelpSearch(null, query, undefined)).toEqual({
        totalCount: 0,
        countBefore: null,
      });
    });
  });
});

describe('a hidden row is never found', () => {
  beforeEach(async () => {
    const parent = await insertHelpArticle(
      sql,
      { title: 'Testwort Hushwillow Guide', slug: 'testwort-hushwillow-guide', shown: false },
      E.id,
    );
    await insertHelpArticle(
      sql,
      {
        title: 'Testwort Duskthorn Page',
        slug: 'testwort-duskthorn-page',
        parent_id: parent,
      },
      E.id,
    );
    await insertHelpArticle(
      sql,
      {
        title: 'Testwort Embercress Notes',
        slug: 'testwort-embercress-notes',
        audience: 'keeper',
        shown: false,
      },
      E.id,
    );
  });

  it('never answers a hidden row’s words, to a keeper either, by full text or a likeness', async () => {
    // Precondition: the rows are live, so the flag alone keeps them out.
    const [row] =
      await sql`select count(*)::int as count from help_articles where shown = false and deleted_at is null`;
    expect(row.count).toBe(2);

    for (const session of [null, asUser(B), asUser(F), asUser(E)]) {
      expect(await slugsFor(session, 'hushwillow')).toEqual([]);
      expect(await slugsFor(session, 'hushwilow')).toEqual([]);
    }
    expect(await slugsFor(asUser(E), 'embercress')).toEqual([]);
    expect(await slugsFor(asUser(E), 'embrcress')).toEqual([]);
  });

  it('never answers a shown child of a hidden parent', async () => {
    expect(await slugsFor(null, 'duskthorn')).toEqual([]);
    expect(await slugsFor(asUser(E), 'duskthorn')).toEqual([]);

    // Precondition: once the parent is shown, the child's words find it.
    await sql`update help_articles set shown = true where slug = 'testwort-hushwillow-guide'`;
    expect(await slugsFor(null, 'duskthorn')).toEqual(['testwort-duskthorn-page']);
  });

  it('lets a hidden row’s words not stop the likeness fallback for a shown row', async () => {
    // The hidden row matches the words in full; the shown one only by likeness, so the fallback must still answer it.
    await insertHelpArticle(
      sql,
      { title: 'Testwort Saltmarrow', slug: 'testwort-saltmarrow', shown: false },
      E.id,
    );
    await insertHelpArticle(sql, { title: 'Testwort Saltmarow', slug: 'testwort-saltmarow' }, E.id);

    expect(await slugsFor(null, 'saltmarrow')).toEqual(['testwort-saltmarow']);
  });
});
