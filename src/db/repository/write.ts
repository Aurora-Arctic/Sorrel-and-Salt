import { and, eq, getTableColumns, inArray, isNull, lte, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import { applyAudit, publishActor } from '../audit';
import type { AuditSession, PrivilegeDeclaration } from '../types';
// The database client; why only the repository may import it: see `select.ts`.
// oxlint-disable-next-line no-restricted-imports
import { db } from '../connection';
import { ingredientDeities } from '../../modules/ingredients/schema/ingredient-deities';
import { ingredientVariants } from '../../modules/ingredients/schema/ingredient-variants';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import { retiredIngredientSlugs } from '../../modules/ingredients/schema/retired-ingredient-slugs';
import { fold, inCompendium, listFolds, notSoftDeleted, scopedTo } from './predicates';
import { adminRoleWrites } from './admin-roles';
import { invitationWrites } from './invitations';
import { membershipWrites, workspaceWrites } from './memberships';
import { spellStepWrites } from './spells';
import { stockWrites } from './stock';
import { existsIn, selectFrom } from './select';
import { StaleWrite } from '@/lib/errors';
import type { Membership } from '@/modules/coven';
import type {
  AuditWriter,
  ColumnMatch,
  Identified,
  Revisioned,
  TwoTier,
  WorkspaceScoped,
  WriterContext,
} from './types';

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

  // An UPDATE that changes nothing keeps its stamps (the `set_updated_at()`
  // trigger); a touch is the one that must move them, and says so for
  // its own statement through `app.touch_row`, then clears it so no later
  // write in the transaction reads it.
  const touch = async (table: PgTable, where: SQL | undefined) => {
    await tx.execute(sql`select set_config('app.touch_row', 'on', true)`);
    const touched = await update(table, {}, where);
    await tx.execute(sql`select set_config('app.touch_row', '', true)`);
    return touched;
  };

  const inWorkspaceById = (
    membership: Membership,
    table: PgTable & WorkspaceScoped & Identified,
    id: string,
  ) => and(scopedTo(membership, table), eq(table.id, id));

  // The revision check rides in the UPDATE's own WHERE, so two saves racing for one revision cannot both land: the second
  // waits on the first's row lock and no longer matches. Only a refused write reads again, under FOR UPDATE, with the same
  // `where`, to tell a stale revision from a row that is not there.
  const updateAtRevision = async (
    table: PgTable & Identified & Revisioned,
    where: SQL | undefined,
    expectedRevision: number | null,
    values: object,
  ): Promise<never> => {
    if (expectedRevision === null) return update(table, values, where);
    const written: unknown[] = await update(
      table,
      values,
      and(where, eq(table.revision, expectedRevision)),
    );
    if (written.length > 0) return written as never;
    const [current] = await selectFrom(table, and(notSoftDeleted(table), where), {
      lockIn: tx,
      lockOrder: table.id,
    });
    if (current) throw new StaleWrite((current as { revision: number }).revision);
    return [] as never;
  };

  // What a marked table's named writes are built from, in the repository file
  // beside its finders: spread in below, so a new marked table adds
  // its writes there rather than here.
  const context: WriterContext = { tx, session, insert, update, softDelete };

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
    updateRevisioned: (membership, table, id, expectedRevision, values) =>
      updateAtRevision(table, inWorkspaceById(membership, table, id), expectedRevision, values),
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
    insertInCompendium: (_curator, table, values) =>
      insert(table, { ...values, workspaceId: null }),
    updateByIdInCompendium: (_curator, table, id, values) =>
      update(table, values, inCompendiumById(table, id)),
    // coalesce keeps a mark the entry already has, in the one statement, so two
    // curators switching it on together leave the first's date and name.
    setReviewInCompendium: (curator, id, reviewed) =>
      update(
        ingredients,
        reviewed
          ? {
              curatorReviewedAt: sql`coalesce(${ingredients.curatorReviewedAt}, now())`,
              curatorReviewedBy: sql`coalesce(${ingredients.curatorReviewedBy}, ${curator.userId})`,
            }
          : { curatorReviewedAt: null, curatorReviewedBy: null },
        inCompendiumById(ingredients, id),
      ),
    touchByIdInCompendium: (_curator, table, id) =>
      touch(table, inCompendiumById(table, id)) as never,
    touchByIdInWorkspace: (membership, table, id) =>
      touch(table, inWorkspaceById(membership, table, id)) as never,
    softDeleteByIdInCompendium: (_curator, table, id) =>
      softDelete(table, inCompendiumById(table, id)),
    deleteLapsedSlugRetirements: (_curator, at) =>
      tx
        .delete(retiredIngredientSlugs)
        .where(and(inCompendium(retiredIngredientSlugs), lte(retiredIngredientSlugs.expiresAt, at)))
        .returning(),
    // One statement: no slug moves, so every holding entry takes the same
    // rewrite. The list is rebuilt in its own order, each entry folding to
    // `from` replaced and every other kept as written.
    carryAstrologyRename: (_curator, list, from, to) => {
      const column = ingredients[list];
      const fromFold = fold(from);
      const entry = sql.identifier('entry');
      const at = sql.identifier('at');
      return update(
        ingredients,
        {
          [list]: sql`array(
            select case when ${fold(entry)} = ${fromFold} then ${to}::text else ${entry} end
            from unnest(${column}) with ordinality as listed(${entry}, ${at})
            order by ${at})`,
        },
        and(inCompendium(ingredients), inArray(fromFold, listFolds(column))),
      );
    },
    // One statement over the variants: no slug moves, since a slug carries no
    // form, so every pick takes the same rewrite. The entry's tier
    // and liveness by the builder's correlated `EXISTS`, so a coven's variant
    // is never reached.
    carryFormRename: (_curator, formId, form) =>
      update(
        ingredientVariants,
        { form },
        and(
          eq(ingredientVariants.formId, formId),
          existsIn(
            ingredients,
            and(inCompendium(ingredients), eq(ingredients.id, ingredientVariants.ingredientId)),
          ),
        ),
      ),
    // One statement: no slug moves and the name is the deity's own, so every
    // link takes the same rewrite. `deity_id` is matched here as the service
    // read it, and the entry's tier and liveness by the builder's correlated
    // `EXISTS`, so a coven's link is never reached.
    carryDeityRename: (_curator, deityId, name) =>
      update(
        ingredientDeities,
        { name },
        and(
          eq(ingredientDeities.deityId, deityId),
          existsIn(
            ingredients,
            and(inCompendium(ingredients), eq(ingredients.id, ingredientDeities.ingredientId)),
          ),
        ),
      ),
    ...adminRoleWrites(context),
    ...invitationWrites(context),
    ...membershipWrites(context),
    ...spellStepWrites(context),
    ...stockWrites(context),
    ...workspaceWrites(context),
    delete: (table, match) => {
      const where = matching(table, match);
      return where ? (tx.delete(table).where(where).returning() as never) : Promise.resolve([]);
    },
  };
}

/**
 * `delete`'s predicate: each column of `match` equal to its value (null where `null`, or in its list), `undefined` for an empty
 * list, which matches nothing. A match naming no column, or a key not in the table, throws rather than delete more than asked.
 */
function matching<TTable extends PgTable>(
  table: TTable,
  match: ColumnMatch<TTable>,
): SQL | undefined {
  const columns: Record<string, AnyPgColumn> = getTableColumns(table);
  const entries = Object.entries(match as Record<string, unknown>);
  if (entries.length === 0) throw new Error('write.delete needs a column to match on');

  const conditions: SQL[] = [];
  for (const [key, value] of entries) {
    const column = columns[key];
    if (!column || value === undefined) {
      throw new Error(`write.delete cannot match on "${key}"`);
    }
    if (value === null) conditions.push(isNull(column));
    else if (!Array.isArray(value)) conditions.push(eq(column, value));
    else if (value.length === 0) return undefined;
    else conditions.push(inArray(column, value));
  }
  return and(...conditions);
}

/**
 * The only write path: one transaction, the acting user published as `app.current_user_id`, every stamp from `session` never a
 * request body, and a rollback if `fn` throws. A write changing a privilege column on `users` declares how in `privilege`.
 */
export async function withAudit<T>(
  session: AuditSession,
  fn: (write: AuditWriter) => Promise<T>,
  privilege?: PrivilegeDeclaration,
): Promise<T> {
  if (!session?.userId) {
    throw new Error('withAudit requires a session with an acting user id');
  }

  return db.transaction(async (tx) => {
    // The privilege trigger on `users` reads `app.current_user_id` as the ledger row's actor and refuses a privilege change
    // whose `app.privilege_route` is empty; the GUC is also what lets a history trigger and RLS arrive as one migration. **Do not
    // remove it.** `app.impersonated_by` names the admin acting as `userId` (claude-docs/db/write-path.md, "app.current_user_id, published per transaction").
    await publishActor(tx, {
      userId: session.userId,
      impersonatedBy: session.impersonatedBy,
      route: privilege?.via,
      note: privilege?.note,
    });
    return fn(writerFor(tx, session));
  });
}
