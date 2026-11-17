import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { Forbidden } from '@/lib/errors';
import type { Session } from '@/lib/session';
import type { PageEntry, PageRequest } from '@/lib/types';
import type { HelpArticle } from '@/modules/help';
import * as help from '@/modules/help';
import { assertCurator, assertSiteAdmin } from '@/modules/identity';
import { B, E, F, asUser } from '../../../support/as-user';
import { useTestDatabase } from '../../../support/db/database';
import { insertHelpArticle } from '../../../support/db/insert-help-article';

// The staff index lists only what staff and keepers read, so the read leaves the public rows out in SQL: a row cap
// applied before a filter in the page would let public rows ranked first crowd the staff rows out (CLAUDE.md rule 7).
// The GraphQL field keeps the read of every audience the reader reaches.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

// Typed with the option until the service takes it, so this file type-checks before the change.
const listStaffHelpArticles = help.listStaffHelpArticles as unknown as (
  session: Session,
  page: PageRequest,
  options?: { withPublic?: boolean },
) => Promise<PageEntry<HelpArticle>[]>;

// Fewer rows than the public ones ranked ahead of the staff and keeper rows.
const SMALL: PageRequest = { limit: 3, inverted: false };
const PUBLIC_COUNT = 5;
const WHOLE: PageRequest = { limit: 101, inverted: false };

const slugsOf = (entries: PageEntry<HelpArticle>[]) => entries.map((entry) => entry.node.slug);
const audiencesOf = (entries: PageEntry<HelpArticle>[]) =>
  new Set(entries.map((entry) => entry.node.audience));

beforeEach(async () => {
  await sql`truncate help_articles cascade`;
  // A to Z, every public row sorts ahead of the staff and keeper rows.
  for (let i = 1; i <= PUBLIC_COUNT; i += 1) {
    await insertHelpArticle(
      sql,
      { title: `Testwort Aldermoss ${i}`, slug: `testwort-aldermoss-${i}`, audience: 'public' },
      E.id,
    );
  }
  await insertHelpArticle(
    sql,
    {
      title: 'Testwort Zephyr Staff Notes',
      slug: 'testwort-zephyr-staff-notes',
      audience: 'staff',
    },
    E.id,
  );
  await insertHelpArticle(
    sql,
    {
      title: 'Testwort Zephyr Keeper Notes',
      slug: 'testwort-zephyr-keeper-notes',
      audience: 'keeper',
    },
    E.id,
  );
});

describe('the staff index read leaves the public rows out in SQL', () => {
  it('answers a keeper the staff and keeper rows that public rows fill a read of every audience past', async () => {
    // Preconditions: the keeper is a keeper, and a read of every audience at this size holds only public rows.
    expect(assertSiteAdmin(asUser(E))).toEqual({ userId: E.id });
    const everyAudience = await listStaffHelpArticles(asUser(E), SMALL);
    expect(everyAudience.length).toBeGreaterThan(0);
    expect(audiencesOf(everyAudience)).toEqual(new Set(['public']));

    const staffOnly = await listStaffHelpArticles(asUser(E), SMALL, { withPublic: false });

    expect(slugsOf(staffOnly).sort()).toEqual([
      'testwort-zephyr-keeper-notes',
      'testwort-zephyr-staff-notes',
    ]);
  });

  it('answers a curator the staff row and never the keeper row', async () => {
    // Preconditions: the curator is a curator and not a keeper, and a read of every audience at this size holds only public rows.
    expect(assertCurator(asUser(F))).toEqual({ userId: F.id });
    expect(() => assertSiteAdmin(asUser(F))).toThrow(Forbidden);
    expect(audiencesOf(await listStaffHelpArticles(asUser(F), SMALL))).toEqual(new Set(['public']));

    const staffOnly = await listStaffHelpArticles(asUser(F), SMALL, { withPublic: false });

    expect(slugsOf(staffOnly)).toEqual(['testwort-zephyr-staff-notes']);
  });

  it('keeps the read of every audience for a caller that names no option', async () => {
    const keeper = await listStaffHelpArticles(asUser(E), WHOLE);

    expect(audiencesOf(keeper)).toEqual(new Set(['public', 'staff', 'keeper']));
  });

  it('refuses a reader who is neither a curator nor a keeper', async () => {
    // Precondition: the reader holds no site role, though staff rows exist to answer.
    expect(B.role).toBe('user');
    expect(slugsOf(await listStaffHelpArticles(asUser(F), WHOLE))).toContain(
      'testwort-zephyr-staff-notes',
    );

    await expect(listStaffHelpArticles(asUser(B), SMALL, { withPublic: false })).rejects.toThrow(
      Forbidden,
    );
  });
});
