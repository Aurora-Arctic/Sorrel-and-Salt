import { beforeAll, describe, expect, it, vi } from 'vitest';
import type postgres from 'postgres';
import { findCompendiumPage, findIngredientSuggestions } from '@/db/repository';
import { FIXTURE_USERS, WORKSPACE_W_ID } from '@/db/seed/standard';
import { assertMembership } from '@/modules/coven';
import { B, asUser } from '../../support/as-user';
import { useTestDatabase } from '../../support/db/database';
import type { PageRequest } from '@/lib/types';
import type { Logged } from '../../support/db/types';

// The plan the ranked compendium search runs, and the substitute picker's
// search (MB.138) beside it: each statement is read off the connection's log
// and explained, so the plan is the one the finder really sends
// (claude-docs/db/compendium-read.md, "The compendium read"). The 0.5 word
// threshold's effect is ingredients.test.ts's to prove by the rows it finds.

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
