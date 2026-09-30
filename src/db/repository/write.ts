import { and, eq, inArray, lte, sql, type SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { applyAudit } from '../audit';
import type { AuditSession } from '../types';
// The choke point the rule exists to protect — enforced by lint as of M1.17.
// oxlint-disable-next-line no-restricted-imports
import { db } from '../connection';
import { retiredIngredientSlugs } from '../../modules/ingredients/schema/retired-ingredient-slugs';
import { inCompendium, notSoftDeleted, scopedTo } from './predicates';
import type { Membership } from '@/modules/coven';
import type { AuditWriter, Identified, TwoTier, WorkspaceScoped } from './types';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Drizzle types `.values()`/`.set()` against the table's own insert model, which
// `applyAudit` widens by exactly that table's audit columns; the cast is
// confined here.
function writerFor(tx: Transaction, session: AuditSession): AuditWriter {
  const insert = (table: PgTable, values: object) =>
    tx
      .insert(table)
      .values(applyAudit('insert', values, session) as never)
      .returning() as never;

  // Rule 4 on the write side: every update and soft delete skips a deleted
  // row, decided by the table's shape as a finder's filter is. The way back to
  // one is a restore, which is v2's.
  const update = (table: PgTable, values: object, where: SQL | undefined) =>
    tx
      .update(table)
      .set(applyAudit('update', values, session) as never)
      .where(and(notSoftDeleted(table), where))
      .returning() as never;

  const softDelete = (table: PgTable, where: SQL | undefined) =>
    tx
      .update(table)
      .set(applyAudit('delete', {}, session) as never)
      .where(and(notSoftDeleted(table), where))
      .returning() as never;

  const inWorkspaceById = (
    membership: Membership,
    table: PgTable & WorkspaceScoped & Identified,
    id: string,
  ) => and(scopedTo(membership, table), eq(table.id, id));

  const inCompendiumById = (table: PgTable & TwoTier & Identified, id: string) =>
    and(inCompendium(table), eq(table.id, id));

  return {
    insert,
    // `workspaceId` last, though `values` is typed without it: the column
    // answers to the proof even if a cast smuggled one in.
    insertInWorkspace: (membership, table, values) =>
      insert(table, { ...values, workspaceId: membership.workspaceId }),
    update,
    updateById: (table, id, values) => update(table, values, eq(table.id, id)),
    updateInWorkspace: (membership, table, values, where) =>
      update(table, values, and(scopedTo(membership, table), where)),
    updateByIdInWorkspace: (membership, table, id, values) =>
      update(table, values, inWorkspaceById(membership, table, id)),
    softDelete,
    softDeleteByIds: (table, ids) =>
      ids.length === 0 ? Promise.resolve([]) : softDelete(table, inArray(table.id, [...ids])),
    softDeleteInWorkspace: (membership, table, where) =>
      softDelete(table, and(scopedTo(membership, table), where)),
    softDeleteByIdInWorkspace: (membership, table, id) =>
      softDelete(table, inWorkspaceById(membership, table, id)),
    // The proof is not read: unlike a `Membership` it carries nothing the
    // query needs, and what it buys is that the call cannot be written without
    // it. `workspaceId` last, as above.
    insertInCompendium: (_admin, table, values) => insert(table, { ...values, workspaceId: null }),
    updateByIdInCompendium: (_admin, table, id, values) =>
      update(table, values, inCompendiumById(table, id)),
    softDeleteByIdInCompendium: (_admin, table, id) =>
      softDelete(table, inCompendiumById(table, id)),
    deleteLapsedSlugRetirements: (_admin, at) =>
      tx
        .delete(retiredIngredientSlugs)
        .where(and(inCompendium(retiredIngredientSlugs), lte(retiredIngredientSlugs.expiresAt, at)))
        .returning(),
    delete: (table, where) => tx.delete(table).where(where).returning() as never,
  };
}

/**
 * The only write path: one transaction, the acting user published as
 * `app.current_user_id`, every stamp from `session` — never a request body —
 * and a rollback if `fn` throws.
 */
export async function withAudit<T>(
  session: AuditSession,
  fn: (write: AuditWriter) => Promise<T>,
): Promise<T> {
  if (!session?.userId) {
    throw new Error('withAudit requires a session with an acting user id');
  }

  return db.transaction(async (tx) => {
    // Nothing reads the GUC in v1; it is what makes the v2 history trigger and
    // deferred RLS one migration. **Do not remove it as unused.** `set_config(…,
    // true)` is `SET LOCAL` with a bind parameter: discarded at COMMIT or
    // ROLLBACK, never riding a pooled connection into the next request
    // (claude-docs/db/write-path.md, "app.current_user_id, published per transaction").
    await tx.execute(sql`select set_config('app.current_user_id', ${session.userId}, true)`);
    return fn(writerFor(tx, session));
  });
}
