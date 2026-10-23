import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { truncateAllTables } from '../../support/seeded-database';
import { seed } from '@/db/seed/index';
import { STANDARD_CUPBOARD, STANDARD_STOCK, WORKSPACE_W_ID, identityOf } from '@/db/seed/standard';

// What running `standard` alone leaves in W's stock (claude-docs/db/standard-scenario.md,
// "W's stock"). `demo` builds on these jars; its own test covers what it adds.

let sql: ReturnType<typeof postgres>;

beforeAll(async () => {
  sql = postgres(process.env.DATABASE_URL as string, { onnotice: () => {} });
  await truncateAllTables(sql);
  await seed(drizzle(sql), { scenario: 'standard' });
});

afterAll(async () => {
  await sql.end();
});

describe('seed(db, { scenario: "standard" }) stock', () => {
  const stockRows = () => sql`
    select s.id, s.quantity_on_hand, s.unit, s.unit_dimension, s.low_stock_threshold,
           i.identity_key, v.form
    from inventory_items s
    join ingredients i on i.id = s.ingredient_id
    join ingredient_variants v on v.id = s.variant_id
    where s.workspace_id = ${WORKSPACE_W_ID} and s.deleted_at is null`;

  it('holds exactly the jars the list names, among them one unmeasured and one under a set threshold', async () => {
    const rows = await stockRows();

    expect(rows.map((row) => row.id).sort()).toEqual(STANDARD_STOCK.map((jar) => jar.id).sort());
    const unmeasured = rows.filter((row) => row.quantity_on_hand === null);
    expect(unmeasured.map((row) => [row.unit, row.low_stock_threshold])).toEqual([[null, null]]);
    const comfrey = rows.find((row) => row.identity_key === 'symphytum officinale');
    expect(Number(comfrey?.quantity_on_hand)).toBeLessThan(Number(comfrey?.low_stock_threshold));
    // The default where the jar sets none: Mugwort's 4 g is under the weight default.
    const mugwort = rows.find((row) => row.identity_key === 'artemisia vulgaris');
    expect(Number(mugwort?.quantity_on_hand)).toBeLessThanOrEqual(
      Number(mugwort?.low_stock_threshold),
    );
    expect(new Set(rows.map((row) => row.unit_dimension))).toEqual(
      new Set(['weight', 'volume', 'count', null]),
    );
  });

  it('holds every entry it stocks in the cupboard', async () => {
    const held = new Set(STANDARD_CUPBOARD.map((row) => identityOf(row.entry)));
    const stocked = await stockRows();

    // Precondition: there are jars, so the check below tests something.
    expect(stocked.length).toBeGreaterThan(0);
    expect(stocked.filter((row) => !held.has(row.identity_key))).toEqual([]);
  });

  it('writes nothing twice when run again', async () => {
    await seed(drizzle(sql), { scenario: 'standard' });

    expect(await stockRows()).toHaveLength(STANDARD_STOCK.length);
  });
});
