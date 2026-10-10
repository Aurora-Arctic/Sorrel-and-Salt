import { beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import {
  type AuditWriter,
  findMany,
  findManyIncludingSoftDeleted,
  findOne,
  withAudit,
} from '@/db/repository';
import { WORKSPACE_W_ID } from '@/db/seed/standard';
import { type Membership, assertMembership } from '@/modules/coven';
import { assertSiteAdmin } from '@/modules/identity';
import { namedWrites } from '@/db/table-marks';
import { A, asUser } from '../../support/as-user';
import {
  herbs,
  impostor,
  jars,
  pairs,
  session,
  sql,
  switches,
  tiers,
  tinctures,
  useProbeTables,
} from '../../support/db/probe-tables';

useProbeTables();

describe('withAudit', () => {
  it('stamps insert audit ids from the session', async () => {
    const [row] = await withAudit(session, (write) => write.insert(herbs, { name: 'Rosemary' }));

    expect(row.name).toBe('Rosemary');
    expect(row.createdBy).toBe(session.userId);
    expect(row.updatedBy).toBe(session.userId);
    expect(row.deletedAt).toBeNull();
  });

  it('takes audit ids from the session, never the payload', async () => {
    const [row] = await withAudit(session, (write) =>
      write.insert(herbs, {
        name: 'Sage',
        createdBy: impostor.userId,
        updatedBy: impostor.userId,
      } as Parameters<typeof write.insert>[1]),
    );

    expect(row.createdBy).toBe(session.userId);
    expect(row.updatedBy).toBe(session.userId);
  });

  it('stamps only updated_* on update, leaving created_* as inserted', async () => {
    const [inserted] = await withAudit(session, (write) => write.insert(herbs, { name: 'Thyme' }));

    const [updated] = await withAudit(impostor, (write) =>
      write.update(herbs, { name: 'Wild thyme' }, eq(herbs.id, inserted.id)),
    );

    expect(updated.name).toBe('Wild thyme');
    expect(updated.createdBy).toBe(session.userId);
    expect(updated.updatedBy).toBe(impostor.userId);
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(inserted.updatedAt.getTime());
  });

  it('soft-deletes by stamping deleted_*, leaving the row in place', async () => {
    const [inserted] = await withAudit(session, (write) => write.insert(herbs, { name: 'Yarrow' }));

    const [deleted] = await withAudit(impostor, (write) =>
      write.softDelete(herbs, eq(herbs.id, inserted.id)),
    );

    expect(deleted.deletedBy).toBe(impostor.userId);
    expect(deleted.deletedAt).toBeInstanceOf(Date);

    const rows = await sql`select id from repository_probe_herbs`;
    expect(rows).toHaveLength(1);
  });

  it('soft-deletes by id the rows named, stamping deleted_* and leaving the rest', async () => {
    const [kept] = await withAudit(session, (write) => write.insert(herbs, { name: 'Vervain' }));
    const [first] = await withAudit(session, (write) => write.insert(herbs, { name: 'Rue' }));
    const [second] = await withAudit(session, (write) => write.insert(herbs, { name: 'Tansy' }));

    const deleted = await withAudit(impostor, (write) =>
      write.softDeleteByIds(herbs, [first.id, second.id]),
    );

    expect(deleted.map((row) => row.id).sort()).toEqual([first.id, second.id].sort());
    expect(deleted.every((row) => row.deletedBy === impostor.userId)).toBe(true);
    await expect(findMany(herbs)).resolves.toEqual([expect.objectContaining({ id: kept.id })]);
  });

  it('soft-deletes nothing, without a statement, for an empty id list', async () => {
    await withAudit(session, (write) => write.insert(herbs, { name: 'Vervain' }));

    const deleted = await withAudit(session, (write) => write.softDeleteByIds(herbs, []));

    expect(deleted).toEqual([]);
    await expect(findMany(herbs)).resolves.toHaveLength(1);
  });

  it('rolls the whole transaction back when the callback throws', async () => {
    await expect(
      withAudit(session, async (write) => {
        await write.insert(herbs, { name: 'Mandrake' });
        throw new Error('spell fizzled');
      }),
    ).rejects.toThrow('spell fizzled');

    const rows = await sql`select id from repository_probe_herbs`;
    expect(rows).toHaveLength(0);
  });

  it('rolls back a later write in the same transaction, not just the failing one', async () => {
    await expect(
      withAudit(session, async (write) => {
        await write.insert(herbs, { name: 'Belladonna' });
        await write.update(
          herbs,
          { name: null } as unknown as { name: string },
          eq(herbs.name, 'Belladonna'),
        );
      }),
    ).rejects.toThrow();

    const rows = await sql`select id from repository_probe_herbs`;
    expect(rows).toHaveLength(0);
  });

  it('rejects a write with no acting user rather than stamping a blank id', async () => {
    await expect(
      withAudit({ userId: '' }, (write) => write.insert(herbs, { name: 'Nightshade' })),
    ).rejects.toThrow(/session/i);

    const rows = await sql`select id from repository_probe_herbs`;
    expect(rows).toHaveLength(0);
  });
});

describe('app.current_user_id (M1.19)', () => {
  it('exposes the acting user to SQL running inside the transaction', async () => {
    const [row] = await withAudit(session, (write) => write.insert(herbs, { name: 'Vervain' }));

    expect(row.actingUser).toBe(session.userId);
  });

  it('scopes the setting to the transaction, so it does not leak to a later one', async () => {
    await withAudit(session, (write) => write.insert(herbs, { name: 'Elder' }));

    const [second] = await withAudit(impostor, (write) => write.insert(herbs, { name: 'Rue' }));

    expect(second.actingUser).toBe(impostor.userId);
  });

  it('does not leak across pooled connections under concurrency', async () => {
    // More callers than pool connections, at once; each must see its own id.
    // Transaction-scoped `set_config(.., true)` is what makes that true — a
    // session-level `SET` would fail this.
    const actors = Array.from({ length: 24 }, (_, index) => ({
      userId: `00000000-0000-0000-0000-${String(index).padStart(12, '0')}`,
    }));

    const rows = await Promise.all(
      actors.map(async (actor) => {
        const [row] = await withAudit(actor, (write) =>
          write.insert(herbs, { name: `Herb ${actor.userId}` }),
        );
        return row;
      }),
    );

    for (const [index, row] of rows.entries()) {
      expect(row.actingUser).toBe(actors[index].userId);
      expect(row.createdBy).toBe(actors[index].userId);
    }
  });

  it('leaves the setting unset on a connection outside any withAudit transaction', async () => {
    await withAudit(session, (write) => write.insert(herbs, { name: 'Betony' }));

    const [{ value }] = await sql`
      select current_setting('app.current_user_id', true) as value
    `;
    expect(value ?? null).toBeNull();
  });

  it('publishes the impersonating admin as app.impersonated_by, stamping the user acted as (MB.53)', async () => {
    const acting = { userId: session.userId, impersonatedBy: impostor.userId };

    const [row] = await withAudit(acting, (write) => write.insert(herbs, { name: 'Mugwort' }));

    expect(row.createdBy).toBe(session.userId);
    expect(row.updatedBy).toBe(session.userId);
    expect(row.actingUser).toBe(session.userId);
    expect(row.impersonatingAdmin).toBe(impostor.userId);
  });

  it('publishes app.impersonated_by empty on every other write, so none inherits a pooled value (MB.53)', async () => {
    await withAudit({ ...session, impersonatedBy: impostor.userId }, (write) =>
      write.insert(herbs, { name: 'Tansy' }),
    );

    const rows = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        withAudit(session, (write) => write.insert(herbs, { name: `Plain ${index}` })),
      ),
    );

    for (const [row] of rows) expect(row.impersonatingAdmin).toBe('');
  });

  it('publishes a declared route and note as app.privilege_route and app.privilege_note (MB.195)', async () => {
    const [row] = await withAudit(session, (write) => write.insert(herbs, { name: 'Yarrow' }), {
      via: 'admin',
      note: 'Keeps the herb garden',
    });

    expect(row.privilegeRoute).toBe('admin');
    expect(row.privilegeNote).toBe('Keeps the herb garden');
    expect(row.actingUser).toBe(session.userId);
  });

  it('publishes both empty when nothing is declared, so none inherits a pooled value (MB.195)', async () => {
    await withAudit(session, (write) => write.insert(herbs, { name: 'Woad' }), {
      via: 'manual',
      note: 'Fixed by hand',
    });

    const rows = await Promise.all(
      Array.from({ length: 12 }, (_, index) =>
        withAudit(session, (write) => write.insert(herbs, { name: `Undeclared ${index}` })),
      ),
    );

    for (const [row] of rows) {
      expect(row.privilegeRoute).toBe('');
      expect(row.privilegeNote).toBe('');
    }
  });

  it('publishes an empty note when a route is declared without one (MB.195)', async () => {
    const [row] = await withAudit(session, (write) => write.insert(herbs, { name: 'Madder' }), {
      via: 'bootstrap',
    });

    expect(row.privilegeRoute).toBe('bootstrap');
    expect(row.privilegeNote).toBe('');
  });

  it('leaves the route and note unset on a connection outside any withAudit transaction (MB.195)', async () => {
    await withAudit(session, (write) => write.insert(herbs, { name: 'Agrimony' }), {
      via: 'admin',
      note: 'Transaction-local',
    });

    const [settings] = await sql`
      select current_setting('app.privilege_route', true) as route,
             current_setting('app.privilege_note', true) as note
    `;
    expect(settings.route ?? null).toBeNull();
    expect(settings.note ?? null).toBeNull();
  });

  it('never opens a transaction at all when there is no acting user', async () => {
    await expect(
      withAudit({ userId: '' }, (write) => write.insert(herbs, { name: 'Hemlock' })),
    ).rejects.toThrow(/session/i);

    const rows = await sql`select id from repository_probe_herbs`;
    expect(rows).toHaveLength(0);
  });
});

// `write.delete` is how the two hard-deleted join tables are written, typed so it cannot
// be pointed at anything else (MB.34).
describe('hard delete on a table with no delete columns (MB.34)', () => {
  const herbId = '22222222-2222-2222-2222-222222222222';
  const charmId = '33333333-3333-3333-3333-333333333333';
  const otherCharmId = '44444444-4444-4444-4444-444444444444';

  const isPair = (herb: string, charm: string) =>
    and(eq(pairs.herbId, herb), eq(pairs.charmId, charm)) as ReturnType<typeof eq>;

  // Eight since M10.3, which argued for `updateByIdInWorkspace` in its own PR:
  // MB.33 bars a service from importing `drizzle-orm`, so a service cannot
  // build the `where` `updateInWorkspace` wants and the by-id predicate has to
  // be built below the boundary. Nine since MB.60, whose promotion of the
  // primary admin is the first by-id write to an unscoped table (`users`),
  // for the same reason. Ten since M8.2, whose folk-name edit tombstones the
  // names a save dropped — a batch of ids, the soft-delete twin of
  // `findManyByIds`. Thirteen since M5.2, whose admin writes are the first to
  // a two-tier table's compendium rows, which neither the unscoped methods
  // (the table carries `workspace_id`) nor the proof-scoped ones (the proof
  // names a workspace) can reach. Fourteen since MB.82, whose lapsed slug
  // retirements are hard-deleted though the table carries `deleted_at`: a
  // redirect that has ended answers nothing, and `delete` is typed to refuse
  // such a table, so the one delete is named for it. Fifteen since M5.3, whose
  // coven delete names its ingredient by id, for `updateByIdInWorkspace`'s
  // reason. Seventeen since MB.62, whose pause ledger is opened and ended by
  // name: the generic insert would take a pause already ended and the generic
  // update would reopen one, so both are refused the table and its two writes
  // are named for it, the ended pair stamped from the session. Twenty since
  // MB.69, whose admin invitation will authorise a grant: a generic insert
  // would let any service mint one, so the table takes a named insert under
  // the proof and a named accept and revoke, each matching a pending row.
  // Twenty-one since M5.6a, whose form rename rewrites the compendium entries
  // picking the form: the vocabulary module may not name `ingredients`, so
  // the rewrite and the slugs it retires are named for it, below the boundary,
  // matching only an entry that still picks the form. Twenty-two since MB.95,
  // whose planet and sign renames rewrite the compendium entries listing them,
  // for the same reason: the list is rewritten below the boundary, matching
  // only an entry that still holds the old spelling. Twenty-three since
  // MB.132, whose deity rename rewrites the compendium's links to the deity:
  // `ingredient_deities` is the ingredients module's, so the rewrite is named
  // below the boundary, matching only a live link whose entry is a live
  // compendium row. A twenty-fourth is the next such decision.
  it('offers exactly twenty-three writer methods — a twenty-fourth is a decision, not a convenience', async () => {
    const methods = await withAudit(session, async (write) => Object.keys(write).sort());

    expect(methods).toEqual(
      [
        'acceptAdminInvitation',
        'carryAstrologyRename',
        'carryDeityRename',
        'carryFormRename',
        'delete',
        'deleteLapsedSlugRetirements',
        'insert',
        'insertAdminInvitation',
        'insertInCompendium',
        'insertInWorkspace',
        'pauseAdminRoleChanges',
        'resumeAdminRoleChanges',
        'revokeAdminInvitation',
        'softDelete',
        'softDeleteByIdInCompendium',
        'softDeleteByIdInWorkspace',
        'softDeleteByIds',
        'softDeleteInWorkspace',
        'update',
        'updateById',
        'updateByIdInCompendium',
        'updateByIdInWorkspace',
        'updateInWorkspace',
      ].sort(),
    );
  });

  it('stamps a join row with the four stamp columns and gives it no delete columns', async () => {
    const [row] = await withAudit(session, (write) => write.insert(pairs, { herbId, charmId }));

    expect(row.createdBy).toBe(session.userId);
    expect(row.updatedBy).toBe(session.userId);
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.updatedAt).toBeInstanceOf(Date);
    expect(row).not.toHaveProperty('deletedAt');
    expect(row).not.toHaveProperty('deletedBy');
  });

  it('removes the row outright, leaving no tombstone behind', async () => {
    await withAudit(session, (write) => write.insert(pairs, { herbId, charmId }));
    await withAudit(session, (write) => write.insert(pairs, { herbId, charmId: otherCharmId }));

    const [removed] = await withAudit(impostor, (write) =>
      write.delete(pairs, { herbId, charmId }),
    );

    expect(removed).toMatchObject({ herbId, charmId });
    const rows = await sql`select charm_id from repository_probe_pairs`;
    expect(rows.map((row) => row.charm_id)).toEqual([otherCharmId]);
  });

  // MB.125: a service names the rows by value, since it may not build an `SQL`
  // predicate (MB.33).
  it('deletes every pair whose column is in a list, and nothing for an empty one', async () => {
    const thirdCharmId = '55555555-5555-5555-5555-555555555555';
    for (const charm of [charmId, otherCharmId, thirdCharmId]) {
      await withAudit(session, (write) => write.insert(pairs, { herbId, charmId: charm }));
    }

    const none = await withAudit(session, (write) => write.delete(pairs, { herbId, charmId: [] }));
    const removed = await withAudit(session, (write) =>
      write.delete(pairs, { herbId, charmId: [charmId, thirdCharmId] }),
    );

    expect(none).toEqual([]);
    expect(removed).toHaveLength(2);
    const rows = await sql`select charm_id from repository_probe_pairs`;
    expect(rows.map((row) => row.charm_id)).toEqual([otherCharmId]);
  });

  it('refuses a match naming no column, rather than emptying the table', async () => {
    await withAudit(session, (write) => write.insert(pairs, { herbId, charmId }));

    await expect(withAudit(session, (write) => write.delete(pairs, {}))).rejects.toThrow(
      'needs a column to match on',
    );
    await expect(
      withAudit(session, (write) => write.delete(pairs, { herbId: undefined })),
    ).rejects.toThrow('cannot match on "herbId"');
    await expect(findMany(pairs)).resolves.toHaveLength(1);
  });

  it('lets the same pair be re-added afterwards, with no partial index to make it possible', async () => {
    await withAudit(session, (write) => write.insert(pairs, { herbId, charmId }));
    await withAudit(session, (write) => write.delete(pairs, { herbId, charmId }));

    const [readded] = await withAudit(session, (write) => write.insert(pairs, { herbId, charmId }));

    expect(readded).toMatchObject({ herbId, charmId });
    await expect(findMany(pairs)).resolves.toHaveLength(1);
  });

  it('rolls a delete back with the rest of its transaction', async () => {
    await withAudit(session, (write) => write.insert(pairs, { herbId, charmId }));

    await expect(
      withAudit(session, async (write) => {
        await write.delete(pairs, { herbId, charmId });
        throw new Error('spell fizzled');
      }),
    ).rejects.toThrow('spell fizzled');

    const rows = await sql`select charm_id from repository_probe_pairs`;
    expect(rows).toHaveLength(1);
  });

  it('reads a table with no deleted_at through the ordinary finders', async () => {
    await withAudit(session, (write) => write.insert(pairs, { herbId, charmId }));
    await withAudit(session, (write) => write.insert(pairs, { herbId, charmId: otherCharmId }));

    await expect(findMany(pairs)).resolves.toHaveLength(2);
    await expect(findMany(pairs, eq(pairs.charmId, charmId))).resolves.toEqual([
      expect.objectContaining({ charmId }),
    ]);
    await expect(findOne(pairs, isPair(herbId, otherCharmId))).resolves.toMatchObject({
      charmId: otherCharmId,
    });
  });

  it('still filters a soft-deletable table, so the two shapes do not bleed into each other', async () => {
    const [row] = await withAudit(session, (write) => write.insert(herbs, { name: 'Tansy' }));
    await withAudit(session, (write) => write.softDelete(herbs, eq(herbs.id, row.id)));

    await expect(findMany(herbs)).resolves.toEqual([]);
    await expect(findManyIncludingSoftDeleted(herbs)).resolves.toHaveLength(1);
  });

  // Neither body runs: each `@ts-expect-error` fails `npm run typecheck` the
  // moment its constraint is loosened, which a runtime assertion cannot see.
  it('refuses the wrong table at compile time in both directions', () => {
    const hardDeleteASoftDeletableTable = (write: AuditWriter) =>
      // @ts-expect-error — `herbs` carries deletedAt, so it is soft-deleted or
      // not deleted at all; write.delete cannot be pointed at it.
      write.delete(herbs, { id: herbId });

    const softDeleteATableWithNothingToStamp = (write: AuditWriter) =>
      // @ts-expect-error — `pairs` has no deleted_at to stamp, so softDelete
      // refuses it rather than writing an UPDATE that sets nothing.
      write.softDelete(pairs, isPair(herbId, charmId));

    const softDeleteAJoinTableById = (write: AuditWriter) =>
      // @ts-expect-error — the same by id; `pairs` has neither a deleted_at nor an id.
      write.softDeleteByIds(pairs, [herbId]);

    const softDeleteAScopedTableById = (write: AuditWriter) =>
      // @ts-expect-error — `jars` carries workspace_id, so an id list alone
      // cannot reach it: its soft-delete is softDeleteInWorkspace, under a proof.
      write.softDeleteByIds(jars, [herbId]);

    expect(hardDeleteASoftDeletableTable).toBeInstanceOf(Function);
    expect(softDeleteATableWithNothingToStamp).toBeInstanceOf(Function);
    expect(softDeleteAJoinTableById).toBeInstanceOf(Function);
    expect(softDeleteAScopedTableById).toBeInstanceOf(Function);
  });
});

// The compendium tier of a two-tier table, `workspace_id IS NULL`, reached
// only under the site role's proof (claude-docs/db/site-admin-proof.md, "The SiteAdmin proof").
describe('the compendium tier, under the SiteAdmin proof', () => {
  const admin = assertSiteAdmin({ ...session, role: 'admin' });
  const workspaceId = '55555555-5555-5555-5555-555555555555';
  const DELETED_AT = new Date('2020-01-01T00:00:00Z');

  /** A row written by the raw client, stamped by `session` — not by the code under test. */
  async function seed(name: string, columns: Record<string, unknown> = {}) {
    const [row] = await sql`
      insert into repository_probe_tinctures ${sql({
        name,
        created_by: session.userId,
        updated_by: session.userId,
        ...columns,
      })}
      returning *`;
    return row;
  }

  async function rowOf(id: string) {
    const [row] = await sql`select * from repository_probe_tinctures where id = ${id}`;
    return row;
  }

  it('inserts into the compendium, stamped from the session, whatever workspaceId the values carry', async () => {
    const [row] = await withAudit(session, (write) =>
      write.insertInCompendium(admin, tinctures, {
        name: 'Tincture of Testwort',
        workspaceId,
      } as Parameters<typeof write.insertInCompendium>[2]),
    );

    expect(row).toMatchObject({
      workspaceId: null,
      createdBy: session.userId,
      updatedBy: session.userId,
    });
  });

  it('updates a compendium row by id, stamping updated_* only', async () => {
    const seeded = await seed('Tincture of Testwort');

    const [updated] = await withAudit(impostor, (write) =>
      write.updateByIdInCompendium(admin, tinctures, seeded.id, { name: 'Tincture, relabelled' }),
    );

    expect(updated).toMatchObject({
      name: 'Tincture, relabelled',
      createdBy: session.userId,
      updatedBy: impostor.userId,
    });
  });

  it('soft-deletes a compendium row by id, leaving it in place', async () => {
    const seeded = await seed('Tincture of Testwort');

    const [deleted] = await withAudit(impostor, (write) =>
      write.softDeleteByIdInCompendium(admin, tinctures, seeded.id),
    );

    expect(deleted.deletedBy).toBe(impostor.userId);
    expect(deleted.deletedAt).toBeInstanceOf(Date);
    expect(await rowOf(seeded.id)).toBeDefined();
  });

  // Why each refusal below could have gone through: the id names a real row,
  // and the same call writes a live compendium row, as the two tests above show.
  describe.each([
    ['a workspace row', { workspace_id: workspaceId }],
    ['a soft-deleted compendium row', { deleted_at: DELETED_AT, deleted_by: session.userId }],
  ])('by the id of %s', (_what, columns) => {
    it('updates nothing and leaves the row as it was', async () => {
      const seeded = await seed('Tincture of Testwort', columns);

      const updated = await withAudit(impostor, (write) =>
        write.updateByIdInCompendium(admin, tinctures, seeded.id, { name: 'Tincture, relabelled' }),
      );

      expect(updated).toEqual([]);
      expect(await rowOf(seeded.id)).toEqual(seeded);
    });

    it('deletes nothing, leaving the stamps as they were', async () => {
      const seeded = await seed('Tincture of Testwort', columns);

      const deleted = await withAudit(impostor, (write) =>
        write.softDeleteByIdInCompendium(admin, tinctures, seeded.id),
      );

      expect(deleted).toEqual([]);
      expect(await rowOf(seeded.id)).toEqual(seeded);
    });
  });

  // Neither body runs, as above: `npm run typecheck` is the assertion.
  it('refuses a table without a compendium tier, and a caller without the proof, at compile time', () => {
    const intoAWorkspaceOnlyTable = (write: AuditWriter) =>
      // @ts-expect-error — `jars`' workspace_id is NOT NULL, so it has no compendium tier to write.
      write.insertInCompendium(admin, jars, { label: 'Testwort' });

    const intoAnUnscopedTable = (write: AuditWriter) =>
      // @ts-expect-error — `herbs` carries no workspace_id at all; its insert is write.insert.
      write.insertInCompendium(admin, herbs, { name: 'Testwort' });

    const withoutTheProof = (write: AuditWriter) =>
      // @ts-expect-error — a SiteAdmin is assertSiteAdmin's alone; an object literal is not one.
      write.softDeleteByIdInCompendium({ userId: session.userId }, tinctures, workspaceId);

    expect(intoAWorkspaceOnlyTable).toBeInstanceOf(Function);
    expect(intoAnUnscopedTable).toBeInstanceOf(Function);
    expect(withoutTheProof).toBeInstanceOf(Function);
  });
});

// MB.198: a table marked `namedWrites` is reached only through its own named
// writer methods, and the mark is the whole refusal: no column name is read
// (claude-docs/db/write-path.md, "Table marks"). No body runs: each
// `@ts-expect-error` fails `npm run typecheck` the moment a generic method
// stops demanding `Generic`, which a runtime assertion cannot see.
describe('a table marked namedWrites, refused by every generic writer method', () => {
  const admin = assertSiteAdmin({ ...session, role: 'admin' });
  const id = session.userId;
  const where = eq(herbs.id, id);

  // Why each refusal below is the mark's: `switches` is `herbs`' shape and
  // `tiers` is `tinctures`', and every call below compiles against those
  // unmarked. `switches` carries `deleted_at`, which refuses the hard delete
  // too, so that one is also asserted against `pairs` marked, the shape
  // `delete` otherwise takes.
  it('takes every call below against the same shapes unmarked', () => {
    const unmarked = [
      (write: AuditWriter) => write.insert(herbs, { name: 'Testwort' }),
      (write: AuditWriter) => write.update(herbs, { name: 'Testwort' }, where),
      (write: AuditWriter) => write.updateById(herbs, id, { name: 'Testwort' }),
      (write: AuditWriter) => write.softDelete(herbs, where),
      (write: AuditWriter) => write.softDeleteByIds(herbs, [id]),
      (write: AuditWriter) => write.delete(pairs, { herbId: id }),
      (write: AuditWriter, inW: Membership) =>
        write.insertInWorkspace(inW, tinctures, { name: 'Testwort' }),
      (write: AuditWriter, inW: Membership) =>
        write.updateInWorkspace(inW, tinctures, { name: 'Testwort' }, where),
      (write: AuditWriter, inW: Membership) =>
        write.updateByIdInWorkspace(inW, tinctures, id, { name: 'Testwort' }),
      (write: AuditWriter, inW: Membership) => write.softDeleteInWorkspace(inW, tinctures, where),
      (write: AuditWriter, inW: Membership) => write.softDeleteByIdInWorkspace(inW, tinctures, id),
      (write: AuditWriter) => write.insertInCompendium(admin, tinctures, { name: 'Testwort' }),
      (write: AuditWriter) =>
        write.updateByIdInCompendium(admin, tinctures, id, { name: 'Testwort' }),
      (write: AuditWriter) => write.softDeleteByIdInCompendium(admin, tinctures, id),
    ];

    expect(unmarked).toHaveLength(14);
  });

  it('refuses the unscoped marked table on every unscoped method', () => {
    const writes = [
      (write: AuditWriter) =>
        // @ts-expect-error — the mark: no generic insert.
        write.insert(switches, { name: 'Testwort' }),
      (write: AuditWriter) =>
        // @ts-expect-error — the mark: no generic update.
        write.update(switches, { name: 'Testwort' }, where),
      (write: AuditWriter) =>
        // @ts-expect-error — the mark: nor by id.
        write.updateById(switches, id, { name: 'Testwort' }),
      (write: AuditWriter) =>
        // @ts-expect-error — the mark: no soft delete.
        write.softDelete(switches, where),
      (write: AuditWriter) =>
        // @ts-expect-error — the mark: nor by ids.
        write.softDeleteByIds(switches, [id]),
      (write: AuditWriter) =>
        // @ts-expect-error — the mark, and `deleted_at` beside it: no hard delete.
        write.delete(switches, { id }),
      (write: AuditWriter) =>
        // @ts-expect-error — the mark alone, on a shape `delete` otherwise takes.
        write.delete(namedWrites(pairs), { herbId: id }),
    ];

    expect(writes).toHaveLength(7);
  });

  it('refuses the two-tier marked table on every workspace-scoped and compendium-tier method', () => {
    const writes = [
      (write: AuditWriter, inW: Membership) =>
        // @ts-expect-error — the mark: no generic insert into a workspace.
        write.insertInWorkspace(inW, tiers, { name: 'Testwort' }),
      (write: AuditWriter, inW: Membership) =>
        // @ts-expect-error — the mark: no generic update in one.
        write.updateInWorkspace(inW, tiers, { name: 'Testwort' }, where),
      (write: AuditWriter, inW: Membership) =>
        // @ts-expect-error — the mark: nor by id.
        write.updateByIdInWorkspace(inW, tiers, id, { name: 'Testwort' }),
      (write: AuditWriter, inW: Membership) =>
        // @ts-expect-error — the mark: no soft delete in one.
        write.softDeleteInWorkspace(inW, tiers, where),
      (write: AuditWriter, inW: Membership) =>
        // @ts-expect-error — the mark: nor by id.
        write.softDeleteByIdInWorkspace(inW, tiers, id),
      (write: AuditWriter) =>
        // @ts-expect-error — the mark: no generic insert into the compendium tier.
        write.insertInCompendium(admin, tiers, { name: 'Testwort' }),
      (write: AuditWriter) =>
        // @ts-expect-error — the mark: no update there.
        write.updateByIdInCompendium(admin, tiers, id, { name: 'Testwort' }),
      (write: AuditWriter) =>
        // @ts-expect-error — the mark: no soft delete there.
        write.softDeleteByIdInCompendium(admin, tiers, id),
    ];

    expect(writes).toHaveLength(8);
  });
});

// CLAUDE.md rule 4 on the write side: a soft-deleted row is out of reach of
// every update and every soft delete, decided by the table's shape as the
// finders' filter is (claude-docs/db/write-path.md, "The write path"). The way back to
// one is a restore, which is v2's.
describe('a soft-deleted row, out of reach of every update and soft delete', () => {
  const DELETED_AT = new Date('2020-01-01T00:00:00Z');
  const stamps = { created_by: session.userId, updated_by: session.userId };
  const deleted = { deleted_at: DELETED_AT, deleted_by: session.userId };

  type Call = (write: AuditWriter, id: string) => Promise<unknown[]>;

  /** A live row and a deleted twin, written by the raw client, and a reader for either. */
  async function herbPair() {
    const [live] = await sql`
      insert into repository_probe_herbs ${sql({ name: 'Rue', ...stamps })} returning *`;
    const [tombstone] = await sql`
      insert into repository_probe_herbs ${sql({ name: 'Rue', ...stamps, ...deleted })}
      returning *`;
    const read = async (id: string) =>
      (await sql`select * from repository_probe_herbs where id = ${id}`)[0];
    return { live, tombstone, read };
  }

  async function jarPair() {
    const inW = { workspace_id: WORKSPACE_W_ID, label: 'Rue', ...stamps };
    const [live] = await sql`insert into repository_probe_jars ${sql(inW)} returning *`;
    const [tombstone] = await sql`
      insert into repository_probe_jars ${sql({ ...inW, ...deleted })} returning *`;
    const read = async (id: string) =>
      (await sql`select * from repository_probe_jars where id = ${id}`)[0];
    return { live, tombstone, read };
  }

  let inW: Membership;
  beforeAll(async () => {
    // A owns W in `standard`, the scenario every db worker's clone carries.
    inW = await assertMembership(asUser(A), WORKSPACE_W_ID, { ingredient: ['update'] });
  });

  const unscoped: [string, Call][] = [
    ['update', (write, id) => write.update(herbs, { name: 'Wild rue' }, eq(herbs.id, id))],
    ['updateById', (write, id) => write.updateById(herbs, id, { name: 'Wild rue' })],
    ['softDelete', (write, id) => write.softDelete(herbs, eq(herbs.id, id))],
    ['softDeleteByIds', (write, id) => write.softDeleteByIds(herbs, [id])],
  ];

  const scoped: [string, Call][] = [
    [
      'updateInWorkspace',
      (write, id) => write.updateInWorkspace(inW, jars, { label: 'Wild rue' }, eq(jars.id, id)),
    ],
    [
      'updateByIdInWorkspace',
      (write, id) => write.updateByIdInWorkspace(inW, jars, id, { label: 'Wild rue' }),
    ],
    [
      'softDeleteInWorkspace',
      (write, id) => write.softDeleteInWorkspace(inW, jars, eq(jars.id, id)),
    ],
    ['softDeleteByIdInWorkspace', (write, id) => write.softDeleteByIdInWorkspace(inW, jars, id)],
  ];

  // Why each could have written the tombstone: the same call, naming its live
  // twin the same way, writes that one. The deleted row keeps its stamps —
  // `updated_at` and `deleted_by` included — so a second delete cannot
  // rewrite who made the first.
  it.each(unscoped)(
    '%s writes the live row and leaves the deleted one as it was',
    async (_method, call) => {
      const { live, tombstone, read } = await herbPair();

      await expect(withAudit(impostor, (write) => call(write, live.id))).resolves.toHaveLength(1);
      await expect(withAudit(impostor, (write) => call(write, tombstone.id))).resolves.toEqual([]);
      expect(await read(tombstone.id)).toEqual(tombstone);
    },
  );

  it.each(scoped)(
    '%s writes the live row and leaves the deleted one as it was',
    async (_method, call) => {
      const { live, tombstone, read } = await jarPair();

      await expect(withAudit(impostor, (write) => call(write, live.id))).resolves.toHaveLength(1);
      await expect(withAudit(impostor, (write) => call(write, tombstone.id))).resolves.toEqual([]);
      expect(await read(tombstone.id)).toEqual(tombstone);
    },
  );

  it('still writes a table with no deleted_at, which has no tombstone to skip', async () => {
    const herbId = '22222222-2222-2222-2222-222222222222';
    const charmId = '33333333-3333-3333-3333-333333333333';
    const otherCharmId = '44444444-4444-4444-4444-444444444444';
    await withAudit(session, (write) => write.insert(pairs, { herbId, charmId }));

    const [updated] = await withAudit(impostor, (write) =>
      write.update(pairs, { charmId: otherCharmId }, eq(pairs.charmId, charmId)),
    );

    expect(updated).toMatchObject({ herbId, charmId: otherCharmId, updatedBy: impostor.userId });
  });
});
