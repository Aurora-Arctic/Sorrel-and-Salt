import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import { useTestDatabase } from '../../support/db/database';
import { insertCupboardEntry } from '../../support/db/insert-cupboard-entry';
import { insertIngredient, insertVariant } from '../../support/db/insert-ingredient';
import { insertReference, insertVariantReferenceLink } from '../../support/db/insert-reference';
import { insertStock } from '../../support/db/insert-stock';
import { insertSpell } from '../../support/db/insert-spell';
import { fromRoot } from '../../support/paths';
import { A } from '../../support/as-user';
import { makeIngredient, makeSpell, makeVariant } from '../../support/fixtures';
import { BOOTSTRAP_USER_ID } from '@/db/bootstrap';
import { WORKSPACE_W_ID } from '@/db/seed/standard';

// A migration test, retired once `0090` is in production's journal. `0090` retires the four compendium
// entries ruled out as endangered, in every database the seed already filled: the seed never deletes a
// row whose file is gone. The test database is already migrated, and empty of compendium rows when it
// starts, so the migration's statements are run again over rows each case writes.
//
// The four seed keys are the real ones: the migration matches them, and a fixture that did not carry
// them would prove nothing. Every other name here is invented.

const FILE = fromRoot('src/db/migrations/0090_retire-endangered-entries.sql');

const STATEMENTS = readFileSync(FILE, 'utf8')
  .split('--> statement-breakpoint')
  .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

const ENDANGERED = [
  'aquilaria malaccensis',
  'pterocarpus santalinus',
  'nardostachys jatamansi',
  'liquidambar orientalis',
] as const;

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

const run = async () => {
  for (const statement of STATEMENTS) await sql.unsafe(statement);
};

/** A compendium entry holding `seedKey`, as the seed writes it, with one form. */
async function compendiumEntry(seedKey: string, name = `Fixture ${seedKey}`): Promise<string> {
  const id = await insertIngredient(
    sql,
    makeIngredient({
      name,
      canonicalName: seedKey,
      nomenclature: 'botanical',
      variants: [makeVariant({ form: 'Testform' })],
    }),
    BOOTSTRAP_USER_ID,
  );
  await sql`update ingredients set seed_key = ${seedKey} where id = ${id}`;
  return id;
}

const stateOf = async (id: string) => {
  const [row] = await sql<{ deleted_at: Date | null; deleted_by: string | null }[]>`
    select deleted_at, deleted_by from ingredients where id = ${id}`;
  return row;
};

describe('0090', () => {
  it('soft-deletes each of the four entries, stamped by the seed user', async () => {
    const ids = await Promise.all(ENDANGERED.map((key) => compendiumEntry(key)));

    await run();

    for (const id of ids) {
      const row = await stateOf(id);
      expect(row.deleted_at).not.toBeNull();
      expect(row.deleted_by).toBe(BOOTSTRAP_USER_ID);
    }
  });

  it('matches the seed key and never the name', async () => {
    // Named as an endangered entry would be, but keyed as something else.
    const byName = await compendiumEntry('fixtura testalis', 'Agarwood');
    const other = await compendiumEntry('fixtura alia');
    const target = await compendiumEntry(ENDANGERED[0], 'Fixture Relabelled Wood');

    await run();

    expect((await stateOf(byName)).deleted_at).toBeNull();
    expect((await stateOf(other)).deleted_at).toBeNull();
    expect((await stateOf(target)).deleted_at).not.toBeNull();
  });

  it("leaves a coven's own ingredient alone, whatever it is keyed", async () => {
    const own = await insertIngredient(
      sql,
      makeIngredient({ name: 'Fixture Own', workspaceId: WORKSPACE_W_ID }),
      A.id,
    );
    await sql`update ingredients set seed_key = ${ENDANGERED[1]} where id = ${own}`;

    await run();

    expect((await stateOf(own)).deleted_at).toBeNull();
  });

  it('keeps what a coven owns: its cupboard row, its stock and a spell layer', async () => {
    const entry = await compendiumEntry(ENDANGERED[2]);
    const [{ id: variantId }] = await sql<{ id: string }[]>`
      select id from ingredient_variants where ingredient_id = ${entry}`;
    const cupboard = await insertCupboardEntry(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: entry },
      A.id,
    );
    const stock = await insertStock(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: entry, variantId },
      A.id,
    );
    const spell = await insertSpell(
      sql,
      makeSpell({ workspaceId: WORKSPACE_W_ID, steps: [{ ingredientId: entry }] }),
      A.id,
    );

    await run();

    const [held] =
      await sql`select deleted_at from workspace_compendium_entries where id = ${cupboard}`;
    const [jar] = await sql`select deleted_at from inventory_items where id = ${stock}`;
    const layers = await sql`
      select deleted_at from spell_steps where spell_id = ${spell} and ingredient_id = ${entry}`;
    expect(held.deleted_at).toBeNull();
    expect(jar.deleted_at).toBeNull();
    expect(layers).toHaveLength(1);
    expect(layers[0].deleted_at).toBeNull();
  });

  it('leaves an entry already retired as it was, and runs twice to the same state', async () => {
    const id = await compendiumEntry(ENDANGERED[3]);
    await sql`update ingredients set deleted_at = '2026-01-01', deleted_by = ${A.id} where id = ${id}`;

    await run();
    await run();

    const row = await stateOf(id);
    expect(row.deleted_by).toBe(A.id);
    expect(row.deleted_at?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  describe('the forms beneath a retired entry (owner decision B, 2026-10-29)', () => {
    const variantState = async (id: string) => {
      const [row] = await sql<{ deleted_at: Date | null; deleted_by: string | null }[]>`
        select deleted_at, deleted_by from ingredient_variants where id = ${id}`;
      return row;
    };
    const liveOwned = async (variantId: string) => {
      const [{ links }] = await sql<{ links: string }[]>`
        select count(*) as links from reference_links
        where ingredient_variant_id = ${variantId} and deleted_at is null`;
      const [{ subs }] = await sql<{ subs: string }[]>`
        select count(*) as subs from ingredient_substitutes
        where variant_id = ${variantId} and deleted_at is null`;
      return { links: Number(links), subs: Number(subs) };
    };

    /** An extra form on `entry`, with one reference link and one typed substitute. */
    async function formWithChildren(entry: string, form: string): Promise<string> {
      const id = await insertVariant(
        sql,
        entry,
        makeVariant({ form, substitutes: ['Fixture Stand-in'] }),
        BOOTSTRAP_USER_ID,
      );
      const reference = await insertReference(
        sql,
        { title: `Fixture Book ${form}` },
        BOOTSTRAP_USER_ID,
      );
      await insertVariantReferenceLink(sql, id, reference, BOOTSTRAP_USER_ID);
      return id;
    }

    it('retires a form no coven holds, with its reference links and substitutes', async () => {
      const entry = await compendiumEntry(ENDANGERED[0]);
      const form = await formWithChildren(entry, 'Fixture Chips');
      expect(await liveOwned(form)).toEqual({ links: 1, subs: 1 });

      await run();

      const row = await variantState(form);
      expect(row.deleted_at).not.toBeNull();
      expect(row.deleted_by).toBe(BOOTSTRAP_USER_ID);
      expect(await liveOwned(form)).toEqual({ links: 0, subs: 0 });
    });

    it("keeps a form a coven's stock row names, with its links and substitutes", async () => {
      const entry = await compendiumEntry(ENDANGERED[1]);
      const held = await formWithChildren(entry, 'Fixture Powder');
      const loose = await formWithChildren(entry, 'Fixture Splinters');
      await insertStock(
        sql,
        { workspaceId: WORKSPACE_W_ID, ingredientId: entry, variantId: held },
        A.id,
      );

      await run();

      expect((await variantState(held)).deleted_at).toBeNull();
      expect(await liveOwned(held)).toEqual({ links: 1, subs: 1 });
      expect((await variantState(loose)).deleted_at).not.toBeNull();
    });

    it("keeps a form a coven's spell layer names", async () => {
      const entry = await compendiumEntry(ENDANGERED[2]);
      const held = await formWithChildren(entry, 'Fixture Oil');
      const spell = await insertSpell(
        sql,
        makeSpell({ workspaceId: WORKSPACE_W_ID, steps: [{ ingredientId: entry }] }),
        A.id,
      );
      // The inserter lays an ingredient's first form; the case needs this one.
      await sql`update spell_steps set variant_id = ${held} where spell_id = ${spell}`;

      await run();

      expect((await variantState(held)).deleted_at).toBeNull();
      expect(await liveOwned(held)).toEqual({ links: 1, subs: 1 });
    });

    it('leaves the forms of every other entry alone', async () => {
      const other = await compendiumEntry('fixtura alia');
      const form = await formWithChildren(other, 'Fixture Resin');

      await run();

      expect((await variantState(form)).deleted_at).toBeNull();
      expect(await liveOwned(form)).toEqual({ links: 1, subs: 1 });
    });
  });
});
