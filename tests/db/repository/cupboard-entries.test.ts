import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import {
  findCompendiumMatchesByName,
  findCupboardEntriesOf,
  findCupboardEntry,
} from '@/db/repository';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { assertMembership } from '@/modules/coven';
import { A, D, E, asUser } from '../../support/as-user';
import { useTestDatabase } from '../../support/db/database';
import { insertCupboardEntry } from '../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../support/db/insert-ingredient';
import { makeIngredient } from '../../support/fixtures';

// The reads over M12.13's table (M12.14): a coven's cupboard entry for a
// compendium entry, one or a batch under the coven's proof, and the
// compendium entries a typed name names exactly. Each case seeds the rows the
// read must leave out beside the row it must keep.

let sql: postgres.Sql;
useTestDatabase((client) => {
  sql = client;
});

beforeEach(async () => {
  await sql`truncate ingredients cascade`;
});

const w = () => assertMembership(asUser(A), WORKSPACE_W_ID, { ingredient: ['read'] });
const x = () => assertMembership(asUser(D), WORKSPACE_X_ID, { ingredient: ['read'] });

/** A compendium entry, by its label. */
const compendiumEntry = (name: string, canonicalName: string | null = null) =>
  insertIngredient(
    sql,
    makeIngredient({ name, canonicalName, nomenclature: canonicalName ? 'botanical' : 'none' }),
    E.id,
  );

describe('findCupboardEntry', () => {
  it("reads the coven's own row for a compendium entry, with its overrides", async () => {
    const entry = await compendiumEntry('Testwort', 'Fixtura testalis');
    const id = await insertCupboardEntry(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: entry, label: 'Hedgewort', colors: [] },
      A.id,
    );

    const row = await findCupboardEntry(await w(), entry);

    expect(row).toMatchObject({ id, ingredientId: entry, label: 'Hedgewort', colors: [] });
    expect(row?.workspaceId).toBe(WORKSPACE_W_ID);
  });

  it("never reads another coven's row by the ingredient's id", async () => {
    const entry = await compendiumEntry('Testwort', 'Fixtura testalis');
    await insertCupboardEntry(sql, { workspaceId: WORKSPACE_X_ID, ingredientId: entry }, D.id);
    // Why it could have read: the same ingredient, a live row, and a valid
    // proof of the coven that holds it reads it.
    expect(await findCupboardEntry(await x(), entry)).toBeDefined();

    expect(await findCupboardEntry(await w(), entry)).toBeUndefined();
  });

  it('reads nothing for a coven-tier ingredient, even with a row naming it', async () => {
    const own = await insertIngredient(
      sql,
      makeIngredient({ name: 'Mockroot', nomenclature: 'none', workspaceId: WORKSPACE_W_ID }),
      A.id,
    );
    await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: own }, A.id);
    const [{ count }] = await sql`
      select count(*)::int as count from workspace_compendium_entries
      where ingredient_id = ${own} and deleted_at is null`;
    expect(count).toBe(1);

    expect(await findCupboardEntry(await w(), own)).toBeUndefined();
  });

  it('reads nothing for a soft-deleted row', async () => {
    const entry = await compendiumEntry('Testwort', 'Fixtura testalis');
    await insertCupboardEntry(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: entry, deleted: true },
      A.id,
    );

    expect(await findCupboardEntry(await w(), entry)).toBeUndefined();
  });
});

describe('findCupboardEntriesOf', () => {
  it("reads the coven's live rows for live compendium entries among the ids, and nothing else", async () => {
    const first = await compendiumEntry('Testwort', 'Fixtura testalis');
    const second = await compendiumEntry('Mockleaf');
    const absent = await compendiumEntry('Fixturebark');
    const theirs = await compendiumEntry('Stubroot');
    const ours = [
      await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: first }, A.id),
      await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: second }, A.id),
    ];
    await insertCupboardEntry(sql, { workspaceId: WORKSPACE_X_ID, ingredientId: theirs }, D.id);
    await insertCupboardEntry(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: absent, deleted: true },
      A.id,
    );

    const rows = await findCupboardEntriesOf(await w(), [first, second, absent, theirs]);

    expect(rows.map((row) => row.id).sort()).toEqual([...ours].sort());
    // X's row is there, under X's proof.
    expect(await findCupboardEntriesOf(await x(), [theirs])).toHaveLength(1);
  });

  it('reads nothing for no ids', async () => {
    await expect(findCupboardEntriesOf(await w(), [])).resolves.toEqual([]);
  });
});

describe('findCompendiumMatchesByName', () => {
  it('matches a live compendium entry by its label or formal name, exactly and ignoring case', async () => {
    const byLabel = await compendiumEntry('Testwort', 'Fixtura testalis');
    const byFormal = await compendiumEntry('Hedge Fixture', 'Testwortia');
    // Near, not exact; a coven's own of the same label; a deleted one.
    await compendiumEntry('Testworts');
    await insertIngredient(
      sql,
      makeIngredient({ name: 'Testwort', nomenclature: 'none', workspaceId: WORKSPACE_W_ID }),
      A.id,
    );
    const gone = await compendiumEntry('TESTWORT');
    await sql`update ingredients set deleted_at = now(), deleted_by = ${E.id} where id = ${gone}`;

    expect((await findCompendiumMatchesByName('tEsTwOrT')).map((row) => row.id)).toEqual([byLabel]);
    expect((await findCompendiumMatchesByName('TESTWORTIA')).map((row) => row.id)).toEqual([
      byFormal,
    ]);
    expect(await findCompendiumMatchesByName('Testwor')).toEqual([]);
  });
});
