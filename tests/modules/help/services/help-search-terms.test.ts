import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { Forbidden } from '@/lib/errors';
import type { PageRequest } from '@/lib/types';
import {
  createHelpArticle,
  readKeeperHelpArticle,
  searchHelp,
  updateHelpArticle,
} from '@/modules/help';
import { assertCurator } from '@/modules/identity';
import { C, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertHelpArticle } from '../../../support/db/insert-help-article';

// A row's search terms are written by a keeper alone, through the help write service, as every other help field is.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

const PAGE: PageRequest = { limit: 101, inverted: false };

const termsOf = async (id: string) => {
  const [row] = await sql`select search_terms, updated_by from help_articles where id = ${id}`;
  return row as { search_terms: string | null; updated_by: string };
};

const slugsFor = async (query: string) =>
  (await searchHelp(null, query, PAGE)).map((entry) => entry.node.slug);

beforeEach(async () => {
  await sql`truncate help_articles cascade`;
});

describe('writing a row’s search terms', () => {
  it('creates a row with search terms as a keeper, and the search finds it by them', async () => {
    const created = await createHelpArticle(asUser(E), {
      kind: 'article',
      title: 'Testwort Nettlecap Flag',
      body: 'What the fixture flag marks.',
      searchTerms: 'stinging, prickly',
    });

    expect(created.searchTerms).toBe('stinging, prickly');
    expect(await termsOf(created.id)).toEqual({
      search_terms: 'stinging, prickly',
      updated_by: E.id,
    });
    expect(await slugsFor('prickly')).toEqual(['testwort-nettlecap-flag']);
  });

  it('gives an FAQ entry and a term search terms too', async () => {
    const faq = await createHelpArticle(asUser(E), {
      kind: 'faq',
      title: 'Where does the Testwort go?',
      body: 'Fixture answer.',
      searchTerms: 'shelve',
    });
    const term = await createHelpArticle(asUser(E), {
      kind: 'term',
      title: 'Testwortling',
      body: 'A fixture word.',
      searchTerms: 'sprigling',
    });

    expect((await termsOf(faq.id)).search_terms).toBe('shelve');
    expect((await termsOf(term.id)).search_terms).toBe('sprigling');
  });

  it('sets, keeps and clears them on update, and the keeper’s read answers them for the editor', async () => {
    const id = await insertHelpArticle(
      sql,
      { title: 'Testwort Standing', slug: 'testwort-standing' },
      E.id,
    );

    const updated = await updateHelpArticle(asUser(E), id, { searchTerms: 'briarwick' });
    expect(updated.searchTerms).toBe('briarwick');
    expect((await readKeeperHelpArticle(asUser(E), id)).searchTerms).toBe('briarwick');
    expect(await slugsFor('briarwick')).toEqual(['testwort-standing']);

    // Left out, they stay.
    await updateHelpArticle(asUser(E), id, { title: 'Testwort Standing Renamed' });
    expect((await termsOf(id)).search_terms).toBe('briarwick');

    // Null clears them, and so does a blank, as a blank summary does.
    await updateHelpArticle(asUser(E), id, { searchTerms: null });
    expect((await termsOf(id)).search_terms).toBeNull();
    await updateHelpArticle(asUser(E), id, { searchTerms: 'briarwick' });
    await updateHelpArticle(asUser(E), id, { searchTerms: '   ' });
    expect((await termsOf(id)).search_terms).toBeNull();
    expect(await slugsFor('briarwick')).toEqual([]);
  });

  it.each([
    ['an observer', C],
    ['the curator', F],
  ])('refuses %s writing search terms by direct id, and leaves them', async (_who, user) => {
    const id = await insertHelpArticle(
      sql,
      { title: 'Testwort Guarded', slug: 'testwort-guarded', search_terms: 'thornmoss' },
      E.id,
    );
    // Preconditions: neither holds the keeper role, and F passes the curator check, so the refusal is the keeper line.
    expect(user.role).not.toBe('admin');
    expect(assertCurator(asUser(F))).toEqual({ userId: F.id });

    await expect(
      updateHelpArticle(asUser(user), id, { searchTerms: 'stolenwort' }),
    ).rejects.toThrow(Forbidden);
    await expect(
      createHelpArticle(asUser(user), {
        kind: 'article',
        title: 'Testwort Refused',
        body: 'Fixture.',
        searchTerms: 'stolenwort',
      }),
    ).rejects.toThrow(Forbidden);

    expect(await termsOf(id)).toEqual({ search_terms: 'thornmoss', updated_by: E.id });
    expect(await slugsFor('stolenwort')).toEqual([]);

    // Precondition: the id was right, as the keeper's same call takes it.
    await updateHelpArticle(asUser(E), id, { searchTerms: 'stolenwort' });
    expect((await termsOf(id)).search_terms).toBe('stolenwort');
  });
});
