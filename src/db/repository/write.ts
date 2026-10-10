import { and, eq, getTableColumns, inArray, lte, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import { applyAudit } from '../audit';
import type { AuditSession } from '../types';
// The choke point the rule exists to protect — enforced by lint as of M1.17.
// oxlint-disable-next-line no-restricted-imports
import { db } from '../connection';
import { ingredientDeities } from '../../modules/ingredients/schema/ingredient-deities';
import { ingredients } from '../../modules/ingredients/schema/ingredients';
import { retiredIngredientSlugs } from '../../modules/ingredients/schema/retired-ingredient-slugs';
import { inCompendium, listFolds, notSoftDeleted, scopedTo } from './predicates';
import { adminInvitationWrites } from './admin-invitations';
import { adminRoleChangePauseWrites } from './admin-roles';
import { existsIn } from './select';
import type { Membership } from '@/modules/coven';
import type {
  AuditWriter,
  ColumnMatch,
  Identified,
  IngredientRow,
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

  const inWorkspaceById = (
    membership: Membership,
    table: PgTable & WorkspaceScoped & Identified,
    id: string,
  ) => and(scopedTo(membership, table), eq(table.id, id));

  // What a marked table's named writes are built from, in the repository file
  // beside its finders (MB.198): spread in below, so a new marked table adds
  // its writes there rather than here.
  const context: WriterContext = { tx, session, insert, update };

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
    // One statement: no slug moves, so every holding entry takes the same
    // rewrite. The list is rebuilt in its own order, each entry folding to
    // `from` replaced and every other kept as written.
    carryAstrologyRename: (_admin, list, from, to) => {
      const column = ingredients[list];
      const fold = sql`lower(btrim(${from}))`;
      const entry = sql.identifier('entry');
      const at = sql.identifier('at');
      return update(
        ingredients,
        {
          [list]: sql`array(
            select case when lower(btrim(${entry})) = ${fold} then ${to}::text else ${entry} end
            from unnest(${column}) with ordinality as listed(${entry}, ${at})
            order by ${at})`,
        },
        and(inCompendium(ingredients), inArray(fold, listFolds(column))),
      );
    },
    // One entry at a time: each takes its own slug, derived by the service from
    // the one slug rule. `form_id` is matched here as well as read there, so
    // an entry that picked another form since is not rewritten onto this one.
    carryFormRename: async (_admin, formId, form, entries, at) => {
      const rewritten: IngredientRow[] = [];
      for (const { id, slug, previousSlug } of entries) {
        const [row]: IngredientRow[] = await update(
          ingredients,
          { form, slug },
          and(inCompendiumById(ingredients, id), eq(ingredients.formId, formId)),
        );
        if (!row) continue;
        rewritten.push(row);
        if (slug !== previousSlug) {
          await insert(retiredIngredientSlugs, {
            ingredientId: id,
            slug: previousSlug,
            retiredAt: at,
            workspaceId: null,
          });
        }
      }
      return rewritten;
    },
    // One statement: no slug moves and the name is the deity's own, so every
    // link takes the same rewrite. `deity_id` is matched here as the service
    // read it, and the entry's tier and liveness by the builder's correlated
    // `EXISTS`, so a coven's link is never reached.
    carryDeityRename: (_admin, deityId, name) =>
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
    ...adminRoleChangePauseWrites(context),
    ...adminInvitationWrites(context),
    delete: (table, match) => {
      const where = matching(table, match);
      return where ? (tx.delete(table).where(where).returning() as never) : Promise.resolve([]);
    },
  };
}

/**
 * `delete`'s predicate: each column of `match` equal to its value, or in its
 * list; `undefined` when a list is empty, since the delete then matches
 * nothing. A match naming no column, or a key that is not one of the table's
 * columns, throws: either would otherwise delete more than was asked.
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
    if (!Array.isArray(value)) conditions.push(eq(column, value));
    else if (value.length === 0) return undefined;
    else conditions.push(inArray(column, value));
  }
  return and(...conditions);
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
    // `app.impersonated_by` beside it, for the same reason and with no reader
    // either: the admin acting as `userId` (MB.53), or empty — always set, so a
    // reader never sees the placeholder an earlier transaction left on the
    // connection. One statement, so it costs no second round trip.
    await tx.execute(
      sql`select set_config('app.current_user_id', ${session.userId}, true), set_config('app.impersonated_by', ${session.impersonatedBy ?? ''}, true)`,
    );
    return fn(writerFor(tx, session));
  });
}
