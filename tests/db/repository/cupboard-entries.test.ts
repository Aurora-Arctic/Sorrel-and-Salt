import { beforeEach, describe, expect, it } from 'vitest';
import type postgres from 'postgres';
import {
  countCovensUsing,
  findCompendiumMatchesByName,
  findCupboardEntriesOf,
  findCupboardEntry,
  findCupboardEntryIncludingSoftDeleted,
  findManyOfIngredients,
} from '@/db/repository';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { assertMembership } from '@/modules/coven';
import { assertCurator } from '@/modules/identity';
import { A, D, E, asUser } from '../../support/as-user';
import { useTestDatabase } from '../../support/db/database';
import { insertCupboardEntry } from '../../support/db/insert-cupboard-entry';
import { insertIngredient } from '../../support/db/insert-ingredient';
import { makeIngredient } from '../../support/fixtures';
import { ingredientFolkNames } from '@/modules/ingredients/schema/ingredient-folk-names';

// The reads over the cupboard-entries table: a coven's entry for a compendium entry, one or a batch
// under the coven's proof, and the compendium entries a typed name names exactly. Each case seeds the
// rows the read must leave out beside the row it must keep.

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

/** Soft-deletes the ingredient, as a curator's delete or a coven's own does. */
async function softDelete(id: string) {
  await sql`update ingredients set deleted_at = now(), deleted_by = ${E.id} where id = ${id}`;
}

describe('findCupboardEntryIncludingSoftDeleted (M12.24)', () => {
  it('reads a retired compendium entry beside the live cupboard entry naming it', async () => {
    const entry = await compendiumEntry('Testwort', 'Fixtura testalis');
    const id = await insertCupboardEntry(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: entry },
      A.id,
    );
    await softDelete(entry);
    // Why the hatch is needed: the filtered read no longer answers.
    expect(await findCupboardEntry(await w(), entry)).toBeUndefined();

    const held = await findCupboardEntryIncludingSoftDeleted(await w(), entry);

    expect(held?.entry.id).toBe(entry);
    expect(held?.entry.deletedAt).not.toBeNull();
    expect(held?.cupboardEntry.id).toBe(id);
  });

  it("reads nothing for another coven's row, a removed row, or a coven's own ingredient", async () => {
    const entry = await compendiumEntry('Testwort', 'Fixtura testalis');
    await insertCupboardEntry(sql, { workspaceId: WORKSPACE_X_ID, ingredientId: entry }, D.id);
    const removed = await compendiumEntry('Mockleaf');
    await insertCupboardEntry(
      sql,
      { workspaceId: WORKSPACE_W_ID, ingredientId: removed, deleted: true },
      A.id,
    );
    const own = await insertIngredient(
      sql,
      makeIngredient({ name: 'Mockroot', nomenclature: 'none', workspaceId: WORKSPACE_X_ID }),
      D.id,
    );
    // A row the table does not refuse: W's cupboard naming X's own ingredient.
    await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: own }, A.id);
    for (const id of [entry, removed, own]) await softDelete(id);
    // Why it could have read: X's proof reads X's row.
    expect(await findCupboardEntryIncludingSoftDeleted(await x(), entry)).toBeDefined();

    for (const id of [entry, removed, own]) {
      expect(await findCupboardEntryIncludingSoftDeleted(await w(), id)).toBeUndefined();
    }
  });

  it("admits a held parent's children only for a compendium entry the coven's cupboard names", async () => {
    const entry = await insertIngredient(
      sql,
      makeIngredient({ folkNames: ['Fixture Bane'] }),
      E.id,
    );
    const own = await insertIngredient(
      sql,
      makeIngredient({
        name: 'Mockroot',
        nomenclature: 'none',
        workspaceId: WORKSPACE_X_ID,
        folkNames: ['Fixture Hush'],
      }),
      D.id,
    );
    for (const id of [entry, own]) {
      await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: id }, A.id);
      await softDelete(id);
    }
    const names = async (heldBy?: Awaited<ReturnType<typeof w>>) =>
      (await findManyOfIngredients([await w()], ingredientFolkNames, [entry, own], heldBy)).map(
        ({ name }) => name,
      );
    // Without the proof of use, neither deleted parent admits its children.
    expect(await names()).toEqual([]);

    expect(await names(await w())).toEqual(['Fixture Bane']);
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

describe('countCovensUsing (M12.25)', () => {
  const curator = () => assertCurator(asUser(E));

  it('counts the covens with a live row naming the entry, and no other row', async () => {
    const entry = await compendiumEntry('Testwort', 'Fixtura testalis');
    const other = await compendiumEntry('Fixture Other');
    const local = await insertIngredient(
      sql,
      makeIngredient({ workspaceId: WORKSPACE_W_ID, name: 'Fixture Local', nomenclature: 'none' }),
      A.id,
    );
    expect(await countCovensUsing(curator(), entry)).toBe(0);

    await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: entry }, A.id);
    await insertCupboardEntry(sql, { workspaceId: WORKSPACE_X_ID, ingredientId: entry }, D.id);
    // Rows the count must leave out: another entry's, a coven-tier ingredient's.
    await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: other }, A.id);
    await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: local }, A.id);

    expect(await countCovensUsing(curator(), entry)).toBe(2);
    expect(await countCovensUsing(curator(), other)).toBe(1);
    expect(await countCovensUsing(curator(), local)).toBe(0);
  });

  it('leaves out a soft-deleted row and a soft-deleted coven', async () => {
    const entry = await compendiumEntry('Testwort');
    await insertCupboardEntry(sql, { workspaceId: WORKSPACE_W_ID, ingredientId: entry }, A.id);
    await insertCupboardEntry(
      sql,
      { workspaceId: WORKSPACE_X_ID, ingredientId: entry, deleted: true },
      D.id,
    );
    expect(await countCovensUsing(curator(), entry)).toBe(1);

    await sql`update workspaces set deleted_at = now(), deleted_by = ${A.id} where id = ${WORKSPACE_W_ID}`;
    expect(await countCovensUsing(curator(), entry)).toBe(0);
  });
});
