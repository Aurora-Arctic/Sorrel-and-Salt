import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { findPossibleDuplicates } from '@/modules/ingredients';
import { A, B, asUser } from '../../../support/as-user';

// The query findPossibleDuplicates actually sends, planned. Its results look
// the same whether or not the trigram indexes are reachable, so the plan is
// the only evidence (claude-docs/db.md, "Fuzzy matching").
//
// The connection is rebuilt with a logger rather than the query copied here:
// a hand-written copy would prove a plan for SQL the service may not send.

interface Logged {
  query: string;
  params: unknown[];
}

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

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
  logged.length = 0;
});

/** Every statement the service sent, in order, from one call. */
async function statementsFor(term: string): Promise<Logged[]> {
  await findPossibleDuplicates(asUser(B), WORKSPACE_W_ID, term);
  return [...logged];
}

/** The one statement reading `ingredients`, which is the match itself. */
function match(statements: Logged[]): Logged {
  const reads = statements.filter(({ query }) => /from "ingredients"/.test(query));
  expect(reads).toHaveLength(1);
  return reads[0];
}

describe('the fuzzy duplicate query', () => {
  describe('the threshold is set explicitly, per transaction', () => {
    it('sets pg_trgm.similarity_threshold to 0.4 before matching, inside a transaction', async () => {
      const statements = await statementsFor('Mugwart');
      const setting = statements.findIndex(({ query }) =>
        query.includes(`set_config('pg_trgm.similarity_threshold'`),
      );

      expect(setting).toBeGreaterThanOrEqual(0);
      expect(statements[setting].query).toMatch(/, true\)/);
      expect(statements[setting].params).toEqual(['0.4']);
      expect(statements.indexOf(match(statements))).toBeGreaterThan(setting);
    });

    it('writes the match with the % operator, never a similarity() comparison', async () => {
      const { query } = match(await statementsFor('Mugwart'));

      expect(query).toMatch(/"name" % \$\d+/);
      expect(query).toMatch(/"canonical_name" % \$\d+/);
      expect(query).not.toMatch(/similarity\([^)]*\)\s*[<>]=?/);
    });
  });

  describe('EXPLAIN', () => {
    // Sequential scans are disabled, as ingredients-trigram.test.ts does: a
    // seq scan that survives `enable_seqscan = off` is one with no
    // alternative. That alone is not enough here. The folk-name arm filters
    // `deleted_at IS NULL`, which is `ingredient_folk_names_unique`'s partial
    // predicate, so that index offers a whole-table walk that is cheaper than
    // a GIN probe on a small table and reads like "an index was used". So the
    // folk names are numerous and their trigrams distinct — md5, not a shared
    // prefix — enough that the planner's choice is between the probe and the
    // walk rather than a foregone one.
    beforeEach(async () => {
      await sql`
        insert into ingredients (name, canonical_name, nomenclature, created_by, updated_by)
        select md5('name' || g), md5('formal' || g), 'botanical', ${A.id}, ${A.id}
        from generate_series(1, 10000) g
      `;
      await sql`
        insert into ingredient_folk_names (ingredient_id, name, created_by, updated_by)
        select id, md5(k || name), ${A.id}, ${A.id} from ingredients, generate_series(1, 3) k
      `;
      await sql`analyze ingredients`;
      await sql`analyze ingredient_folk_names`;
    });

    async function planOf({ query, params }: Logged): Promise<string> {
      return await sql.begin(async (tx) => {
        await tx`select set_config('pg_trgm.similarity_threshold', '0.4', true)`;
        await tx`set local enable_seqscan = off`;
        const rows = await tx.unsafe(
          `explain ${query}`,
          params as postgres.ParameterOrJSON<never>[],
        );
        return rows.map((row) => row['QUERY PLAN'] as string).join('\n');
      });
    }

    it('reaches both trigram indexes and scans no table sequentially', async () => {
      const plan = await planOf(match(await statementsFor('Mugwart')));

      expect(plan).toContain('Bitmap Index Scan on ingredients_trgm');
      expect(plan).toContain('Bitmap Index Scan on ingredient_folk_names_trgm');
      expect(plan).not.toContain('Seq Scan');
    });
  });
});
