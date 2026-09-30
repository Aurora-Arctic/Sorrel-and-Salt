import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import postgres from 'postgres';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { suggestCommonNames } from '@/modules/ingredients';
import { A, B, asUser } from '../../../support/as-user';
import type { Logged } from '../../../support/db/types';

// The statement suggestCommonNames actually sends, read and planned, as
// duplicates-plan.test.ts reads findPossibleDuplicates': a `similarity() > n`
// written by mistake returns the same rows, so only the SQL and the plan tell
// them apart. Unlike the vocabularies, both tables here grow with use, so the
// plan is asserted (claude-docs/db.md, "The member's autofill").

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
  it('sets both thresholds before matching, inside a transaction', async () => {
    const statements = await statementsFor('mugwort');
    const setting = statements.findIndex(({ query }) =>
      query.includes(`set_config('pg_trgm.similarity_threshold'`),
    );

    expect(setting).toBeGreaterThanOrEqual(0);
    expect(statements[setting].query).toMatch(/, true\)/);
    expect(statements[setting].params).toEqual(['0.4', '0.6']);
    expect(statements.indexOf(match(statements))).toBeGreaterThan(setting);
  });

  it('matches a display name and a folk name with % and <%, never a similarity() comparison', async () => {
    const { query } = match(await statementsFor('mugwort'));

    expect(query).toMatch(/"ingredients"\."name" % \$\d+/);
    expect(query).toMatch(/\$\d+ <% "ingredients"\."name"/);
    expect(query).toMatch(/"ingredient_folk_names"\."name" % \$\d+/);
    expect(query).toMatch(/\$\d+ <% "ingredient_folk_names"\."name"/);
    expect(query).not.toMatch(/"canonical_name" %|<% "\w+"\."canonical_name"/);
    expect(query).not.toMatch(/similarity\([^)]*\)\s*[<>]=?/);
  });

  // CLAUDE.md rule 7: the scope and the tombstones are in the statement.
  it('reads the compendium tier and the proof’s workspace, live rows only', async () => {
    const { query, params } = match(await statementsFor('mugwort'));

    expect(query).toMatch(
      /"ingredients"\."workspace_id" is null or "ingredients"\."workspace_id" = \$\d+/,
    );
    expect(params).toContain(WORKSPACE_W_ID);
    expect(query).toMatch(/"ingredients"\."deleted_at" is null/);
    expect(query).toMatch(/"ingredient_folk_names"\."deleted_at" is null/);
  });

  describe('EXPLAIN', () => {
    // As in duplicates-plan.test.ts: sequential scans off, distinct (md5)
    // trigrams, and enough rows that the planner's choice is between the GIN
    // probe and a walk of a partial unique index, not a foregone one. The
    // display-name arm needs more than the folk-name arm: its scope is the
    // compendium's own partial index, which the planner walks in preference
    // to the probe at thirty thousand entries and not at fifty.
    beforeEach(async () => {
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
