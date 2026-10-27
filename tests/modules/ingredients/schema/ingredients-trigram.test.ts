import { beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { useTestDatabase } from '../../../support/db/database';
import { FIXTURE_USERS } from '@/db/seed/standard';
import { ingredientSlug } from '@/lib/slugify';

// §9's one multicolumn gin index serves a predicate on either column alone.
// That it is reached is proved on the SQL the services send, in
// common-names-plan.test.ts and duplicates-plan.test.ts (MB.184); what stays
// here is the negative control that makes those plans meaningful — claude-docs/db/fuzzy-matching.md, "Fuzzy matching:
// one index, and a rule every caller is bound by".
const TRIGRAM_INDEX = 'ingredients_trgm';
const AUTHOR = FIXTURE_USERS.A.id;

let sql: ReturnType<typeof postgres>;
useTestDatabase((client) => (sql = client));

async function addIngredient(name: string, canonicalName: string | null): Promise<string> {
  const [inserted] = await sql`
    insert into ingredients (name, slug, canonical_name, nomenclature, created_by, updated_by)
    values (
      ${name},
      ${ingredientSlug(name, canonicalName)},
      ${canonicalName},
      ${canonicalName === null ? 'none' : 'botanical'},
      ${AUTHOR},
      ${AUTHOR}
    )
    returning id
  `;
  return inserted.id as string;
}

// Enough varied rows that "no index was chosen" means something; the planner
// assertions disable sequential scans regardless.
async function fillWithDecoys(): Promise<void> {
  await sql`
    insert into ingredients (name, slug, canonical_name, nomenclature, created_by, updated_by)
    select 'Decoy ' || g, 'decoy-' || g, 'Decoyus ' || g, 'botanical', ${AUTHOR}, ${AUTHOR}
    from generate_series(1, 2000) g
  `;
  await sql`analyze ingredients`;
}

// `explain` as one string, with sequential scans disabled: on a table this
// size the planner would seq-scan past a usable index because the heap costs
// less, and the question is "can this predicate reach the index at all". With
// seq scans on, the `similarity()` assertion below would prove nothing.
async function planFor(query: string, threshold = 0.4): Promise<string> {
  return await sql.begin(async (tx) => {
    await tx.unsafe(`set local pg_trgm.similarity_threshold = ${threshold}`);
    await tx`set local enable_seqscan = off`;
    const rows = await tx.unsafe(`explain ${query}`);
    return rows.map((row) => row['QUERY PLAN'] as string).join('\n');
  });
}

async function matchingNames(name: string, threshold?: number): Promise<string[]> {
  const rows = await sql.begin(async (tx) => {
    if (threshold !== undefined) {
      await tx.unsafe(`set local pg_trgm.similarity_threshold = ${threshold}`);
    }
    return await tx`
      select name from ingredients where name % ${name} order by similarity(name, ${name}) desc
    `;
  });
  return rows.map((row) => row.name as string);
}

describe('ingredients trigram index', () => {
  // The negative control behind the plan tests' "never a similarity()
  // comparison": the same rows, once per file.
  describe('the planner cannot reach it from a similarity() comparison', () => {
    beforeAll(async () => {
      await sql`truncate ingredients cascade`;
      await addIngredient('Mugwort', 'Artemisia vulgaris');
      await fillWithDecoys();
    });

    // §9's trap: `similarity(a, b) > 0.4` is a function call no trigram index
    // can answer. Seq scans are already off, so a seq scan here is the planner
    // having no alternative rather than preferring one. Why the plan tests
    // could have passed wrongly: if `%` could not reach the index either,
    // their plans would read like this one.
    it('cannot be reached by a similarity() comparison, where % reaches it', async () => {
      const functionPlan = await planFor(
        `select id from ingredients where similarity(name, 'Mugwart') > 0.4`,
      );
      const operatorPlan = await planFor(`select id from ingredients where name % 'Mugwart'`);

      expect(functionPlan).toContain('Seq Scan on ingredients');
      expect(functionPlan).not.toContain(TRIGRAM_INDEX);
      expect(operatorPlan).toContain(TRIGRAM_INDEX);
      expect(await matchingNames('Mugwart', 0.4)).toEqual(['Mugwort']);
    });
  });
});
