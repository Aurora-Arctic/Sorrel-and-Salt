import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import {
  findCompendiumCount,
  findCompendiumPage,
  findIngredientSuggestions,
} from '@/db/repository';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';
import { assertMembership } from '@/modules/coven';
import { B, asUser } from '../../support/as-user';
import { useTestDatabase } from '../../support/db/database';
import type { PageRequest } from '@/lib/types';
import type { Logged } from '../../support/db/types';

// The statements a compendium search sends, read off the connection: `<%`
// means "word-similar by pg_trgm.word_similarity_threshold", whose default is
// 0.6, so the search's 0.5 has to be set in the read's own transaction — and
// only when there is a `query` to match (claude-docs/db/compendium-read.md, "The compendium read").
// The substitute picker's search (MB.138) sends the same match over the
// compendium and the proof's coven, so it is read here too. And the plan the
// ranked search runs, read off the same log.

const logged = vi.hoisted(() => [] as Logged[]);

vi.mock('@/db/connection', async () => {
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const { default: connect } = await import('postgres');
  return {
    db: drizzle(connect(process.env.DATABASE_URL as string), {
      logger: { logQuery: (query, params) => logged.push({ query, params }) },
    }),
  };
});

beforeEach(() => {
  logged.length = 0;
});

const PAGE = { limit: 26, inverted: false };
const isSetting = ({ query }: Logged) =>
  query.includes(`set_config('pg_trgm.word_similarity_threshold'`);
const isRead = ({ query }: Logged) => /from "ingredients"/.test(query) && query.includes('<%');

describe('the compendium search query', () => {
  it('sets the word threshold to 0.5, transaction-local, before matching', async () => {
    await findCompendiumPage({ query: 'mugwort' }, PAGE);

    const setting = logged.findIndex(isSetting);
    expect(setting).toBeGreaterThanOrEqual(0);
    expect(logged[setting].query).toMatch(/, true\)/);
    expect(logged[setting].params).toEqual(['0.5']);
    expect(logged.findIndex(isRead)).toBeGreaterThan(setting);
  });

  it('opens no transaction for a page with no `query`', async () => {
    await findCompendiumPage({}, PAGE);

    expect(logged.some(isSetting)).toBe(false);
    expect(logged.some(({ query }) => /^begin/i.test(query))).toBe(false);
  });
});

describe('the ingredient suggestion query', () => {
  it('sets the word threshold to 0.5 before matching, and reads the proof’s coven', async () => {
    const membership = await assertMembership(asUser(B), WORKSPACE_W_ID, { ingredient: ['read'] });
    logged.length = 0;

    await findIngredientSuggestions(membership, 'mugwort', PAGE);

    const setting = logged.findIndex(isSetting);
    expect(logged[setting].params).toEqual(['0.5']);
    const read = logged.findIndex(isRead);
    expect(read).toBeGreaterThan(setting);
    expect(logged[read].query).toMatch(
      /"ingredients"\."workspace_id" is null or "ingredients"\."workspace_id" = \$\d+/,
    );
    expect(logged[read].params).toContain(WORKSPACE_W_ID);
  });
});

describe('the compendium count query', () => {
  const START = { key: ['-1', 'Fixture Mugwort'], id: '00000000-0000-4000-8000-000000000000' };

  it('counts a search in one read, under the page’s 0.5, with no order and no limit', async () => {
    await findCompendiumCount({ query: 'mugwort' }, START);

    const reads = logged.filter(({ query }) => /from "ingredients"/.test(query));
    expect(reads).toHaveLength(1);
    const [read] = reads;
    expect(read.query).toMatch(/count\(\*\) filter \(where/);
    expect(read.query).not.toMatch(/order by|limit/i);
    const setting = logged.findIndex(isSetting);
    expect(logged[setting].params).toEqual(['0.5']);
    expect(logged.indexOf(read)).toBeGreaterThan(setting);
  });

  it('opens no transaction for a count with no `query`', async () => {
    await findCompendiumCount({}, undefined);

    expect(logged.some(isSetting)).toBe(false);
    expect(logged.some(({ query }) => /^begin/i.test(query))).toBe(false);
  });
});

const UNACCENT_INDEX = 'ingredients_unaccent_trgm';
const FOLK_NAMES_UNACCENT_INDEX = 'ingredient_folk_names_unaccent_trgm';
const AUTHOR = FIXTURE_USERS.A.id;

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

/** The page read a finder call sends — the statement and its parameters, as logged. */
async function statementFor(request: () => Promise<unknown>): Promise<Logged> {
  logged.length = 0;
  await request();
  const read = logged.find(({ query }) => /from "ingredients"/.test(query));
  if (!read) throw new Error('the finder sent no read of ingredients');
  return read;
}

/**
 * `explain` of a logged statement, in a transaction holding the search's
 * threshold with sequential scans disabled, so the question is whether the
 * indexes can be reached at all rather than what the planner prefers.
 */
async function explain({ query, params }: Logged): Promise<string> {
  return sql.begin(async (tx) => {
    await tx`select set_config('pg_trgm.word_similarity_threshold', '0.5', true)`;
    await tx`set local enable_seqscan = off`;
    const rows = await tx.unsafe(`explain ${query}`, params as never[]);
    return rows.map((row) => row['QUERY PLAN'] as string).join('\n');
  });
}

describe('the ranked search plan over ~20,000 rows', () => {
  const FIRST: PageRequest = { limit: 26, inverted: false };
  let pageOne: Logged;
  let pageTwo: Logged;
  let suggestions: Logged;

  // Seeded once per file (MB.184): twenty thousand entries and as many folk
  // names that share no word with `mugwort`, and a thousand that do — by
  // label, by formal name and by folk name — at several scores.
  beforeAll(async () => {
    await sql`
      insert into ingredients (name, slug, canonical_name, nomenclature, created_by, updated_by)
      select 'Decoy ' || md5(g::text), 'decoy-' || g, 'Decoyus ' || md5((-g)::text),
             'botanical', ${AUTHOR}, ${AUTHOR}
      from generate_series(1, 20000) g`;
    await sql`
      insert into ingredient_folk_names (ingredient_id, name, created_by, updated_by)
      select id, 'Folk ' || md5(name), ${AUTHOR}, ${AUTHOR} from ingredients where name like 'Decoy %'`;
    await sql`
      insert into ingredients (name, slug, canonical_name, nomenclature, created_by, updated_by)
      select case g % 3 when 0 then 'Fixture Mugwort ' when 1 then 'Fixture Mugwart ' else 'Fixture Mugroot ' end || g,
             'fixture-' || g, 'Fixturus ' || md5(g::text), 'botanical', ${AUTHOR}, ${AUTHOR}
      from generate_series(1, 700) g`;
    await sql`
      insert into ingredient_folk_names (ingredient_id, name, created_by, updated_by)
      select id, 'Mugwort Kin', ${AUTHOR}, ${AUTHOR}
      from ingredients where name like 'Decoy %' order by name limit 300`;
    await sql`analyze ingredients`;
    await sql`analyze ingredient_folk_names`;

    pageOne = await statementFor(() => findCompendiumPage({ query: 'mugwort' }, FIRST));
    const first = await findCompendiumPage({ query: 'mugwort' }, FIRST);
    // The precondition for a second page: the first is full, with more behind it.
    expect(first).toHaveLength(26);
    pageTwo = await statementFor(() =>
      findCompendiumPage({ query: 'mugwort' }, { ...FIRST, after: first[24].cursor }),
    );
    const membership = await assertMembership(asUser(B), WORKSPACE_W_ID, { ingredient: ['read'] });
    suggestions = await statementFor(() => findIngredientSuggestions(membership, 'mugwort', FIRST));
  }, 120_000);

  for (const [label, statement] of [
    ['first page', () => pageOne],
    ['page after a cursor', () => pageTwo],
    ['ingredient suggestion page', () => suggestions],
  ] as const) {
    it(`starts the ${label} from both expression indexes, with no subplan`, async () => {
      const plan = await explain(statement());

      expect(plan).toContain(`Index Scan on ${UNACCENT_INDEX}`);
      expect(plan).toContain(`Index Scan on ${FOLK_NAMES_UNACCENT_INDEX}`);
      expect(plan).not.toContain('SubPlan');
      expect(plan).not.toContain('Seq Scan');
    });
  }
});
