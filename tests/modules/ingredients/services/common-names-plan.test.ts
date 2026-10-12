import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { suggestCommonNames } from '@/modules/ingredients';
import { A, B, asUser } from '../../../support/as-user';
import type { Logged } from '../../../support/db/types';

// The statement suggestCommonNames actually sends, planned, as
// duplicates-plan.test.ts plans findPossibleDuplicates': its results look the
// same whether or not the trigram indexes are reachable, so the plan is the
// only evidence. Unlike the vocabularies, both tables here grow with use, so
// the plan is asserted (claude-docs/db/member-autofill.md, "The member's autofill").

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

let sql: ReturnType<typeof postgres>;

beforeAll(() => {
  sql = postgres(process.env.DATABASE_URL as string);
});

beforeEach(() => {
  logged.length = 0;
});

/** Every statement the service sent, in order, from one call. */
async function statementsFor(query: string): Promise<Logged[]> {
  await suggestCommonNames(asUser(B), WORKSPACE_W_ID, query, { limit: 26, inverted: false });
  return [...logged];
}

/** The one statement reading the folk names, which is the match itself. */
function match(statements: Logged[]): Logged {
  const reads = statements.filter(({ query }) => /from "ingredient_folk_names"/.test(query));
  expect(reads).toHaveLength(1);
  return reads[0];
}

describe('the common-name suggestion query', () => {
  describe('EXPLAIN', () => {
    // Seeded once per file (MB.184), inside the describe that plans. As in
    // duplicates-plan.test.ts: sequential scans off, distinct (md5) trigrams,
    // and enough rows that the planner's choice is between the GIN probe and
    // a walk of a partial unique index, not a foregone one. The display-name
    // arm needs more than the folk-name arm: its scope is the compendium's
    // own partial index, which the planner walks in preference to the probe
    // at thirty thousand entries and not at fifty. Eighty thousand rows
    // through six trigram indexes outrun the 10s default hook timeout on CI's
    // shared runner, so the seed carries its own.
    beforeAll(async () => {
      await sql`truncate ingredients cascade`;
      await sql`
        insert into ingredients (name, slug, canonical_name, nomenclature, created_by, updated_by)
        select md5('name' || g), md5('name' || g), md5('formal' || g), 'botanical', ${A.id}, ${A.id}
        from generate_series(1, 50000) g
      `;
      await sql`
        insert into ingredient_folk_names (ingredient_id, name, created_by, updated_by)
        select id, md5(k || name), ${A.id}, ${A.id}
        from (select id, name from ingredients limit 10000) as named, generate_series(1, 3) k
      `;
      await sql`analyze ingredients`;
      await sql`analyze ingredient_folk_names`;
    }, 60_000);

    // The seed is the plan's precondition: fewer rows and the walk wins.
    it('plans over the seeded rows', async () => {
      const [{ count }] = await sql`select count(*) from ingredient_folk_names`;
      expect(Number(count)).toBe(30000);
    });

    async function planOf({ query, params }: Logged): Promise<string> {
      return await sql.begin(async (tx) => {
        await tx`select set_config('pg_trgm.similarity_threshold', '0.4', true),
          set_config('pg_trgm.word_similarity_threshold', '0.6', true)`;
        await tx`set local enable_seqscan = off`;
        const rows = await tx.unsafe(
          `explain ${query}`,
          params as postgres.ParameterOrJSON<never>[],
        );
        return rows.map((row) => row['QUERY PLAN'] as string).join('\n');
      });
    }

    it('reaches both trigram indexes and scans no table sequentially', async () => {
      const plan = await planOf(match(await statementsFor('mugwort')));

      expect(plan).toContain('Bitmap Index Scan on ingredients_trgm');
      expect(plan).toContain('Bitmap Index Scan on ingredient_folk_names_trgm');
      expect(plan).not.toContain('Seq Scan');
    });
  });
});
