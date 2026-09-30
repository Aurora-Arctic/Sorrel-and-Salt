import { beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import {
  type AuditWriter,
  findMany,
  findManyByIds,
  findManyIncludingSoftDeleted,
  findManyInWorkspace,
  findOne,
  findOneById,
  findOneByIdInWorkspace,
  findOneInWorkspace,
  withAudit,
} from '@/db/repository';
import { ingredientCategories } from '@/modules/ingredients/schema/ingredient-categories';
import { ingredientFolkNames } from '@/modules/ingredients/schema/ingredient-folk-names';
import { spellCategories } from '@/modules/grimoire/schema/spell-categories';
import { spellIngredients } from '@/modules/grimoire/schema/spell-ingredients';
import { spells } from '@/modules/grimoire/schema/spells';
import { WORKSPACE_W_ID, WORKSPACE_X_ID } from '@/db/seed/standard';
import { type Membership, assertMembership } from '@/modules/coven';
import { A, D, asUser } from '../../support/as-user';
import {
  charms,
  herbs,
  impostor,
  jars,
  session,
  sql,
  tinctures,
  useProbeTables,
} from '../../support/db/probe-tables';

useProbeTables();

describe('soft-delete filtering (M1.20)', () => {
  it('findMany excludes a soft-deleted row', async () => {
    const [kept] = await withAudit(session, (write) => write.insert(herbs, { name: 'Comfrey' }));
    const [gone] = await withAudit(session, (write) => write.insert(herbs, { name: 'Foxglove' }));
    await withAudit(session, (write) => write.softDelete(herbs, eq(herbs.id, gone.id)));

    const rows = await findMany(herbs);

    expect(rows.map((row) => row.id)).toEqual([kept.id]);
  });

  it('findMany still applies a caller-supplied condition alongside the filter', async () => {
    await withAudit(session, (write) => write.insert(herbs, { name: 'Mugwort' }));
    const [target] = await withAudit(session, (write) => write.insert(herbs, { name: 'Nettle' }));

    const rows = await findMany(herbs, eq(herbs.name, 'Nettle'));

    expect(rows.map((row) => row.id)).toEqual([target.id]);
  });

  it('findOne returns undefined for a soft-deleted row, not the deleted row', async () => {
    const [row] = await withAudit(session, (write) => write.insert(herbs, { name: 'Wormwood' }));
    await withAudit(session, (write) => write.softDelete(herbs, eq(herbs.id, row.id)));

    await expect(findOne(herbs, eq(herbs.id, row.id))).resolves.toBeUndefined();
  });

  it('findOne returns a live row matching the condition', async () => {
    const [row] = await withAudit(session, (write) => write.insert(herbs, { name: 'Chamomile' }));

    await expect(findOne(herbs, eq(herbs.id, row.id))).resolves.toMatchObject({
      name: 'Chamomile',
    });
  });

  it('the escape hatch, and only the escape hatch, can still see a soft-deleted row', async () => {
    const [row] = await withAudit(session, (write) => write.insert(herbs, { name: 'Hellebore' }));
    await withAudit(session, (write) => write.softDelete(herbs, eq(herbs.id, row.id)));

    await expect(findMany(herbs, eq(herbs.id, row.id))).resolves.toEqual([]);
    const [restorable] = await findManyIncludingSoftDeleted(herbs, eq(herbs.id, row.id));
    expect(restorable).toMatchObject({ id: row.id, deletedAt: expect.any(Date) });
  });

  describe('by id', () => {
    it('findOneById returns the live row with that id', async () => {
      await withAudit(session, (write) => write.insert(herbs, { name: 'Yarrow' }));
      const [row] = await withAudit(session, (write) => write.insert(herbs, { name: 'Tansy' }));

      await expect(findOneById(herbs, row.id)).resolves.toMatchObject({ name: 'Tansy' });
    });

    it('findOneById returns undefined for a soft-deleted row', async () => {
      const [row] = await withAudit(session, (write) => write.insert(herbs, { name: 'Rue' }));
      await withAudit(session, (write) => write.softDelete(herbs, eq(herbs.id, row.id)));

      await expect(findOneById(herbs, row.id)).resolves.toBeUndefined();
    });

    it('findManyByIds returns the live rows named and no others', async () => {
      const [first] = await withAudit(session, (write) => write.insert(herbs, { name: 'Sage' }));
      const [second] = await withAudit(session, (write) => write.insert(herbs, { name: 'Thyme' }));
      const [gone] = await withAudit(session, (write) => write.insert(herbs, { name: 'Henbane' }));
      await withAudit(session, (write) => write.insert(herbs, { name: 'Basil' }));
      await withAudit(session, (write) => write.softDelete(herbs, eq(herbs.id, gone.id)));

      const rows = await findManyByIds(herbs, [first.id, second.id, gone.id]);

      expect(rows.map((row) => row.name).sort()).toEqual(['Sage', 'Thyme']);
    });

    it('findManyByIds answers an empty list of ids with no rows', async () => {
      await withAudit(session, (write) => write.insert(herbs, { name: 'Lovage' }));

      await expect(findManyByIds(herbs, [])).resolves.toEqual([]);
    });
  });

  // claude-docs/db.md, "Soft-delete filtering and the partial-index convention".
  describe('the partial unique index convention', () => {
    it('still blocks a live duplicate', async () => {
      await withAudit(session, (write) => write.insert(charms, { name: 'Ward' }));

      const error: unknown = await withAudit(session, (write) =>
        write.insert(charms, { name: 'Ward' }),
      ).catch((caught: unknown) => caught);

      expect(String((error as { cause?: unknown }).cause ?? error)).toMatch(
        /repository_probe_charms_name_unique/i,
      );
    });

    it('lets the name be reused once the original is soft-deleted', async () => {
      const [original] = await withAudit(session, (write) =>
        write.insert(charms, { name: 'Ward' }),
      );
      await withAudit(session, (write) => write.softDelete(charms, eq(charms.id, original.id)));

      const [reused] = await withAudit(session, (write) => write.insert(charms, { name: 'Ward' }));

      expect(reused.id).not.toBe(original.id);
      await expect(findMany(charms)).resolves.toEqual([expect.objectContaining({ id: reused.id })]);
    });
  });
});

// CLAUDE.md rule 5's second layer. The proofs below are real ones, minted by
// `assertMembership` against the seeded cast: there is no other way to get one,
// which is the property under test.
describe('the Membership proof (M6.3)', () => {
  let inW: Membership;
  let inX: Membership;

  beforeAll(async () => {
    // A owns W and D is a member of X — `standard`, the scenario every db
    // worker's clone carries.
    inW = await assertMembership(asUser(A), WORKSPACE_W_ID, { ingredient: ['create'] });
    inX = await assertMembership(asUser(D), WORKSPACE_X_ID, { ingredient: ['create'] });
  });

  const insertJar = (membership: Membership, label: string) =>
    withAudit(session, (write) => write.insertInWorkspace(membership, jars, { label }));

  describe('write.insertInWorkspace', () => {
    it('fills workspace_id from the proof rather than from the values', async () => {
      const [row] = await insertJar(inW, 'Rosehip');

      expect(row.workspaceId).toBe(WORKSPACE_W_ID);
      expect(row.createdBy).toBe(session.userId);
    });
  });

  describe('write.softDeleteByIdInWorkspace', () => {
    it('tombstones the row with that id in the proof’s workspace, leaving it in place', async () => {
      const [row] = await insertJar(inW, 'Rosehip');

      const [deleted] = await withAudit(impostor, (write) =>
        write.softDeleteByIdInWorkspace(inW, jars, row.id),
      );

      expect(deleted).toMatchObject({ id: row.id, deletedBy: impostor.userId });
      expect(deleted.deletedAt).toBeInstanceOf(Date);
      await expect(findOneByIdInWorkspace(inW, jars, row.id)).resolves.toBeUndefined();
      expect(await sql`select id from repository_probe_jars where id = ${row.id}`).toHaveLength(1);
    });

    // A two-tier table satisfies the type, so the proof's own predicate is what
    // keeps the compendium out: a null workspace_id equals no workspace.
    it('reaches no compendium row of a two-tier table, only the proof’s workspace’s', async () => {
      const stamps = { created_by: session.userId, updated_by: session.userId };
      const [compendiumRow] = await sql`
        insert into repository_probe_tinctures ${sql({ name: 'Testwort', ...stamps })}
        returning id`;
      const [covenRow] = await sql`
        insert into repository_probe_tinctures
          ${sql({ name: 'Testwort', workspace_id: WORKSPACE_W_ID, ...stamps })}
        returning id`;

      const deleted = await withAudit(session, (write) =>
        write.softDeleteByIdInWorkspace(inW, tinctures, compendiumRow.id),
      );

      expect(deleted).toEqual([]);
      const [kept] = await sql`
        select deleted_at from repository_probe_tinctures where id = ${compendiumRow.id}`;
      expect(kept.deleted_at).toBeNull();
      // Why it could have been deleted: the same call takes the coven's row.
      await expect(
        withAudit(session, (write) => write.softDeleteByIdInWorkspace(inW, tinctures, covenRow.id)),
      ).resolves.toHaveLength(1);
    });
  });

  describe('findManyInWorkspace', () => {
    it('returns this workspace’s rows and not the other’s', async () => {
      await insertJar(inW, 'Rosehip');
      await insertJar(inX, 'Nettle');

      await expect(findManyInWorkspace(inW, jars)).resolves.toEqual([
        expect.objectContaining({ label: 'Rosehip' }),
      ]);
      await expect(findManyInWorkspace(inX, jars)).resolves.toEqual([
        expect.objectContaining({ label: 'Nettle' }),
      ]);
    });

    it('still applies deleted_at IS NULL on top of the workspace predicate', async () => {
      const [row] = await insertJar(inW, 'Rosehip');
      await withAudit(session, (write) =>
        write.softDeleteInWorkspace(inW, jars, eq(jars.id, row.id)),
      );

      await expect(findManyInWorkspace(inW, jars)).resolves.toEqual([]);
    });
  });

  describe('findOneByIdInWorkspace', () => {
    it('returns the live row with that id in the proof’s workspace', async () => {
      const [row] = await insertJar(inW, 'Rosehip');

      await expect(findOneByIdInWorkspace(inW, jars, row.id)).resolves.toMatchObject({
        label: 'Rosehip',
      });
    });

    it('returns undefined for a soft-deleted row', async () => {
      const [row] = await insertJar(inW, 'Rosehip');
      await withAudit(session, (write) =>
        write.softDeleteInWorkspace(inW, jars, eq(jars.id, row.id)),
      );

      await expect(findOneByIdInWorkspace(inW, jars, row.id)).resolves.toBeUndefined();
    });

    it('returns undefined for another workspace’s id, which its own proof reads', async () => {
      const [row] = await insertJar(inX, 'Nettle');

      // Why the read could have succeeded: the id is live and X's proof finds it.
      await expect(findOneByIdInWorkspace(inX, jars, row.id)).resolves.toMatchObject({
        label: 'Nettle',
      });

      await expect(findOneByIdInWorkspace(inW, jars, row.id)).resolves.toBeUndefined();
    });
  });

  describe('a direct id belonging to another workspace', () => {
    it('is not readable, though the row exists and its own workspace finds it', async () => {
      const [row] = await insertJar(inX, 'Nettle');

      // Why the read below could have succeeded: this exact id resolves under
      // X's own proof, so the row is present and the finder is reached.
      await expect(findOneInWorkspace(inX, jars, eq(jars.id, row.id))).resolves.toMatchObject({
        label: 'Nettle',
      });

      await expect(findOneInWorkspace(inW, jars, eq(jars.id, row.id))).resolves.toBeUndefined();
    });

    it('is not updatable, and the row is left as it was', async () => {
      const [row] = await insertJar(inX, 'Nettle');

      const updated = await withAudit(session, (write) =>
        write.updateInWorkspace(inW, jars, { label: 'Rewritten' }, eq(jars.id, row.id)),
      );

      expect(updated).toEqual([]);
      await expect(findOneInWorkspace(inX, jars, eq(jars.id, row.id))).resolves.toMatchObject({
        label: 'Nettle',
      });
    });

    it('is not soft-deletable, and keeps its null deleted_at', async () => {
      const [row] = await insertJar(inX, 'Nettle');

      const deleted = await withAudit(session, (write) =>
        write.softDeleteInWorkspace(inW, jars, eq(jars.id, row.id)),
      );

      expect(deleted).toEqual([]);
      await expect(findOneInWorkspace(inX, jars, eq(jars.id, row.id))).resolves.toMatchObject({
        deletedAt: null,
      });
    });

    it('is not soft-deletable by id either, though its own proof deletes it', async () => {
      const [row] = await insertJar(inX, 'Nettle');

      const deleted = await withAudit(session, (write) =>
        write.softDeleteByIdInWorkspace(inW, jars, row.id),
      );

      expect(deleted).toEqual([]);
      await expect(findOneByIdInWorkspace(inX, jars, row.id)).resolves.toMatchObject({
        deletedAt: null,
      });
      // Why the delete could have gone through: this exact call, under X's proof, makes it.
      await expect(
        withAudit(session, (write) => write.softDeleteByIdInWorkspace(inX, jars, row.id)),
      ).resolves.toHaveLength(1);
    });
  });

  // None of these bodies run: each `@ts-expect-error` fails `npm run typecheck`
  // the moment the proof stops being required, which a runtime assertion cannot
  // see — it would pass just as happily against a signature gone optional.
  it('refuses a workspace-scoped table without a proof at compile time', () => {
    const readItUnscoped = () =>
      // @ts-expect-error — `jars` carries workspace_id, so the unscoped finder
      // refuses it: a read of it is scoped by a proof or it is not written.
      findMany(jars);

    const readItWithoutTheProof = () =>
      // @ts-expect-error — the proof is the first argument and is not optional.
      findManyInWorkspace(jars);

    const writeItUnscoped = (write: AuditWriter) =>
      // @ts-expect-error — the same on the write side; `workspace_id` has no
      // source but a proof.
      write.insert(jars, { workspaceId: WORKSPACE_W_ID, label: 'Rosehip' });

    const nameAWorkspaceBesideTheProof = (write: AuditWriter, membership: Membership) =>
      // @ts-expect-error — a `workspaceId` passed alongside the proof is a
      // second source that can disagree with it.
      write.insertInWorkspace(membership, jars, { workspaceId: WORKSPACE_X_ID, label: 'Rosehip' });

    const scopeAnUnscopedTable = (membership: Membership) =>
      // @ts-expect-error — `herbs` has no workspace_id to AND onto the query,
      // so the scoped finder refuses it rather than filtering on nothing.
      findManyInWorkspace(membership, herbs);

    const deleteByIdWithoutTheProof = (write: AuditWriter, id: string) =>
      // @ts-expect-error — the by-id delete takes the proof first, as every scoped write does.
      write.softDeleteByIdInWorkspace(jars, id);

    const deleteAnUnscopedTableById = (write: AuditWriter, membership: Membership, id: string) =>
      // @ts-expect-error — `herbs` has no workspace_id for the proof to scope;
      // its by-id delete is softDeleteByIds.
      write.softDeleteByIdInWorkspace(membership, herbs, id);

    expect(readItUnscoped).toBeInstanceOf(Function);
    expect(readItWithoutTheProof).toBeInstanceOf(Function);
    expect(writeItUnscoped).toBeInstanceOf(Function);
    expect(nameAWorkspaceBesideTheProof).toBeInstanceOf(Function);
    expect(scopeAnUnscopedTable).toBeInstanceOf(Function);
    expect(deleteByIdWithoutTheProof).toBeInstanceOf(Function);
    expect(deleteAnUnscopedTableById).toBeInstanceOf(Function);
  });

  // The same shape for M10.3's two extra scopes. A private spell excluded by a
  // predicate the caller could simply not have written is absent; a private
  // spell the generic finders will not compile against is impossible, and only
  // the second survives the next service that forgets.
  it('refuses the generic finders a spell and its contents at compile time', () => {
    const readSpellsWithoutTheVisibilityRule = (membership: Membership) =>
      // @ts-expect-error — `spells` carries `visibility`, so the generic scoped
      // finder refuses it: findManySpells is the only way in.
      findManyInWorkspace(membership, spells);

    const readOneSpellWithoutTheVisibilityRule = (membership: Membership) =>
      // @ts-expect-error — and the same one row at a time.
      findOneInWorkspace(membership, spells, eq(spells.id, WORKSPACE_W_ID));

    const readLayersUnscoped = () =>
      // @ts-expect-error — `spell_ingredients` carries no workspace_id and so
      // would pass as unscoped; the `spell_id` is what refuses it, because its
      // scope and its visibility are the parent spell's (findManyInSpell).
      findMany(spellIngredients);

    const readAssignmentsUnscoped = () =>
      // @ts-expect-error — the same for `spell_categories`.
      findOne(spellCategories);

    const readLayersThroughTheHatch = () =>
      // @ts-expect-error — the escape hatch takes the unscoped side too, and a
      // hard-deleted table has no soft-deleted row to include anyway (MB.34).
      findManyIncludingSoftDeleted(spellIngredients);

    const scopeAJoinTableByWorkspace = (membership: Membership) =>
      // @ts-expect-error — `spell_categories` has no workspace_id to AND on,
      // which is exactly why it goes through its spell instead.
      findManyInWorkspace(membership, spellCategories);

    expect(readSpellsWithoutTheVisibilityRule).toBeInstanceOf(Function);
    expect(readOneSpellWithoutTheVisibilityRule).toBeInstanceOf(Function);
    expect(readLayersUnscoped).toBeInstanceOf(Function);
    expect(readAssignmentsUnscoped).toBeInstanceOf(Function);
    expect(readLayersThroughTheHatch).toBeInstanceOf(Function);
    expect(scopeAJoinTableByWorkspace).toBeInstanceOf(Function);
  });

  it("refuses the generic finders an ingredient's children at compile time", () => {
    const readAssignmentsUnscoped = () =>
      // @ts-expect-error — `ingredient_categories` carries no workspace_id and so
      // would pass as unscoped; the `ingredient_id` is what refuses it, because
      // its tier is the parent ingredient's (findManyOfIngredients).
      findMany(ingredientCategories);

    const readFolkNamesUnscoped = () =>
      // @ts-expect-error — the same for `ingredient_folk_names`, one row at a time.
      findOne(ingredientFolkNames);

    const readFolkNamesById = () =>
      // @ts-expect-error — and by id, which a folk name has and a join row does not.
      findManyByIds(ingredientFolkNames, [WORKSPACE_W_ID]);

    const readFolkNamesThroughTheHatch = () =>
      // @ts-expect-error — the escape hatch takes the unscoped side too.
      findManyIncludingSoftDeleted(ingredientFolkNames);

    expect(readAssignmentsUnscoped).toBeInstanceOf(Function);
    expect(readFolkNamesUnscoped).toBeInstanceOf(Function);
    expect(readFolkNamesById).toBeInstanceOf(Function);
    expect(readFolkNamesThroughTheHatch).toBeInstanceOf(Function);
  });
});
