import type { ExtractTablesWithRelations, SQL, SQLWrapper } from 'drizzle-orm';
import type { AnyPgColumn, PgTable, PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import type { invitations } from '../../modules/coven/schema/invitations';
import type { workspaceMembers, workspaces } from '../../modules/coven/schema/workspaces';
import type { adminRoleChangePauses } from '../../modules/identity/schema/admin-role-change-pauses';
import type { userPrivilegeChanges } from '../../modules/identity/schema/user-privilege-changes';
import type { auditColumns, users } from '../../modules/identity/schema/users';
import type { ingredientDeities } from '../../modules/ingredients/schema/ingredient-deities';
import type { ingredientVariants } from '../../modules/ingredients/schema/ingredient-variants';
import type {
  CategoryMode,
  IngredientElement,
  NomenclatureKind,
} from '../../modules/ingredients/schema/ingredient-enums';
import type { ingredients } from '../../modules/ingredients/schema/ingredients';
import type { inventoryItems } from '../../modules/ingredients/schema/inventory-items';
import type { referenceLinks } from '../../modules/ingredients/schema/reference-links';
import type { references } from '../../modules/ingredients/schema/references';
import type { workspaceCompendiumEntries } from '../../modules/ingredients/schema/workspace-compendium-entries';
import type { retiredIngredientSlugs } from '../../modules/ingredients/schema/retired-ingredient-slugs';
import type { spellSteps } from '../../modules/grimoire/schema/spell-steps';
import type { GRIMOIRE_ORDERS, spells } from '../../modules/grimoire/schema/spells';
import type { Membership, WorkspaceRole } from '@/modules/coven';
import type { Curator, SiteAdmin } from '@/modules/identity';
import type { Cursor, PageRequest } from '../../lib/types';
import type { AuditSession, Generic } from '../types';
import type { FlatTable, ItemTable, PickedTable } from '../vocabularies';
import type { FormGroupIcon } from '../../modules/vocabulary/schema/form-group-icons';

// The repository's types: the table shapes a finder or writer admits, the
// options `selectFrom` reads, the writer `withAudit` hands out, and the
// finders' arguments and rows. The index re-exports the writer, `SortPart`
// and the finders' arguments and rows; the table shapes and the rest of
// `selectFrom`'s options stay inside the folder.

export type AuditColumnName = keyof typeof auditColumns;

// A table admits the methods its own columns allow: `{ deletedAt?: never }` is
// satisfied only by a table without the column.
export type SoftDeletable = { deletedAt: AnyPgColumn };
export type HardDeletable = { deletedAt?: never };

// The same shape for rule 5's proof: a table carrying `workspace_id` scopes
// itself and may only be reached with a `Membership`, and `{ workspaceId?:
// never }` is the complement — every other table.
export type WorkspaceScoped = { workspaceId: AnyPgColumn };
export type Unscoped = { workspaceId?: never };

// A scoped table whose `workspace_id` is nullable has a second tier, the
// compendium, where it is null — `ingredients` and `retired_ingredient_slugs`.
// Only such a table takes the compendium-tier writes, under a `Curator`
// (which an admin's `SiteAdmin` is too, M11.20).
export type TwoTier = { workspaceId: AnyPgColumn<{ notNull: false }> };

// And once more for visibility (M10.3), so that a table goes through exactly
// one finder — claude-docs/db/spell-visibility.md, "Spell visibility". `spells` is
// workspace-scoped *and* carries a per-row reader rule, so `NotVisibilityScoped`
// takes it off the generic scoped finders and `findOneSpell` and
// `findPageInReadableSpells` name it directly; the two join tables carry a `spell_id` and no workspace of
// their own, so `NotSpellScoped` takes them off the unscoped finders and
// `findManyInSpell` derives both scopes from the parent spell.
export type NotVisibilityScoped = { visibility?: never };
export type SpellScoped = { spellId: AnyPgColumn };
export type NotSpellScoped = { spellId?: never };

// And for an ingredient's children (M4.8): `ingredient_folk_names` and
// `ingredient_categories` carry an `ingredient_id` and no workspace of their
// own, so they would pass as `Unscoped` while holding a coven's rows.
// `NotIngredientScoped` takes them off the unscoped finders, and
// `findManyOfIngredients` reads them under the parent's tier.
export type IngredientScoped = { ingredientId: AnyPgColumn };
export type NotIngredientScoped = { ingredientId?: never };

// And for the rows one form of an ingredient owns beside it (MB.217):
// `ingredient_categories` and `ingredient_substitutes` carry a `variant_id`
// too, null on the ingredient's own rows. `findManyOfVariants` reads a form's
// under its ingredient's tier, reached through the variant, and
// `findManyOfIngredients` reads the ingredient's own, `variant_id IS NULL`
// (the union rule, MB.215).
export type VariantScoped = { variantId: AnyPgColumn };

// And for a table written only through its own named calls: the schema file
// marks it `namedWrites` (MB.198), and every generic method below, unscoped,
// workspace-scoped and compendium-tier, takes `Generic` and so refuses it.
// The mark is the table's own statement, where the markers it replaced keyed
// a refusal on a column one table happened to carry
// (claude-docs/db/write-path.md, "Table marks").

/** A table with a surrogate key, which is every one but the two hard-deleted join tables. */
export type Identified = { id: AnyPgColumn };

// A table carrying `revisionColumn()`, the counter `bump_revision()` moves on
// every update (M13.15), which a revisioned write checks (M13.16).
export type Revisioned = { revision: AnyPgColumn };

// A table addressed by a slug of its own: the curated vocabularies and their groups.
export type Slugged = { slug: AnyPgColumn };

/** A table's own columns, with every audit column removed — they come from the session. */
export type Writable<TTable extends PgTable> = Omit<TTable['$inferInsert'], AuditColumnName>;

/** The same, minus `workspaceId` — it comes from the proof, for the same reason. */
export type WritableInWorkspace<TTable extends PgTable> = Omit<Writable<TTable>, 'workspaceId'>;

/**
 * A sort column a page can be keyed on. NOT NULL, because a NULL key makes
 * a page bound's row comparison NULL and the row falls out of every page.
 */
export type SortColumn = AnyPgColumn<{ notNull: true }>;

/**
 * One part of a page's sort, always ascending: a column, or an expression and
 * the type it is read as, which its cursor text casts back to. An
 * expression's nullness is not in its type, so one that can be NULL is the
 * caller's bug, with the column's consequence. A descending part is written
 * negated.
 */
export type SortPart = SortColumn | { expression: SQL; type: string };

/** A list's key, and what reading it joins and is read under: what its pages and its count share. */
export interface KeyOrder {
  sort: readonly SortPart[];
  id: AnyPgColumn;
  /** A parenthesised, aliased statement joined to the table, which a sort part or the `where` may read. */
  join?: { source: SQL; on: SQL };
  /**
   * A table left-joined after `join`, which a sort part or the `where` may
   * read, null where `on` matched none: a coven's cupboard row beside the
   * entry it names (M12.18). A page carries the joined row onto each entry as
   * `joined`; `on` holds the joined table's own filters.
   */
  leftJoined?: LeftJoin<PgTable>;
  /**
   * The `where` holds a `<%` search, so the read runs in a transaction
   * under `select.ts`'s `SEARCH_WORD_SIMILARITY_THRESHOLD` rather than the
   * server's.
   */
  wordMatch?: boolean;
  /**
   * The `where` holds a `%` match, so the read runs in a transaction under
   * `SIMILARITY_THRESHOLD`, the one a `Similarity` read sets, rather than
   * pg_trgm's 0.3.
   */
  similarityMatch?: boolean;
}

/** How `selectFrom` orders, bounds and keys a page; the cursor bounds are in its `where`. */
export interface Keyset<Carried extends object = {}> extends KeyOrder {
  request: PageRequest;
  /**
   * Values selected beside the row and carried onto its entry, and so onto its
   * edge. Each is read as the driver returns it: a `mapWith` on one is dropped.
   */
  carry?: { [K in keyof Carried]: SQL<Carried[K]> };
}

/**
 * A list's key as a page finder takes it, which keys on the table's own `id`:
 * the sort, with what reading it joins, carries and is read under.
 */
export type ListOrder<Carried extends object = {}> = Omit<Keyset<Carried>, 'id' | 'request'>;

/** What `findPage` and its kin order by: a sort alone, or a `ListOrder`. */
export type PageOrder<Carried extends object = {}> = readonly SortPart[] | ListOrder<Carried>;

/**
 * How `selectFrom` counts a keyset list rather than paging it: every row the
 * `where` holds, and how many come before `start` in `count`'s order. The
 * `where` is a page's without its bounds, and the read takes the key's join
 * and threshold but no order and no limit.
 */
export interface KeysetCount {
  count: KeyOrder;
  /** A page's first row. None on an empty page, whose `countBefore` is null. */
  start: Cursor | undefined;
}

/** A search's accent-folded word match, as `foldedWordMatch` builds it for one query. */
export interface WordMatch {
  /** The query is word-similar (`<%`) to `text`. */
  matches: (text: AnyPgColumn) => SQL;
  /** How word-similar, for a best-match order. */
  similarity: (text: AnyPgColumn) => SQL<number>;
  /** `text` holds the query verbatim, case and accents aside: a full hit, wherever it falls in a word. */
  contains: (text: AnyPgColumn) => SQL;
  /**
   * The character `text` holds the query verbatim from, folded as `contains`
   * reads it, or the largest `integer` where it holds none: what orders
   * hits of equal score, earliest first, a fuzzy hit last. Never null, since
   * a keyset part may not be.
   */
  position: (text: AnyPgColumn) => SQL<number>;
}

/**
 * How `selectFrom` runs a trigram match: `%` and `<%` in its `where` mean
 * `select.ts`'s `SIMILARITY_THRESHOLD` and `WORD_SIMILARITY_THRESHOLD`, and the first `limit` rows come back in
 * `orderBy`'s order. Never a `similarity(a, b) > n` comparison in the `where`:
 * no trigram index can answer a function call (claude-docs/db/fuzzy-matching.md, "Fuzzy
 * matching").
 */
export interface Similarity {
  orderBy: SQL[];
  limit: number;
}

/**
 * How `selectFrom` tallies rows rather than reading them (M12.3): the
 * `aggregate` values, one row per `groupBy` group, or one row for the whole
 * read without a group. The read takes a list's search join and threshold
 * from `over`, as a count does, so it tallies the rows that list's pages
 * hold. Each value is read as the driver returns it, as a carried value is,
 * so a count is cast in SQL rather than mapped.
 */
export interface Aggregate<TRow extends Record<string, unknown>> {
  aggregate: { [K in keyof TRow]: SQL<TRow[K]> };
  over: Pick<KeyOrder, 'join' | 'leftJoined' | 'wordMatch'>;
  /**
   * Tables joined after the search join, in order, each ANDing its own
   * `deleted_at IS NULL` into `on`. A right join keeps every row of its table
   * whatever `on` says, so the `where` is where that table's own filter goes.
   */
  joins?: readonly AggregateJoin[];
  groupBy?: readonly (SQL | AnyPgColumn)[];
  orderBy?: readonly (SQL | AnyPgColumn)[];
}

/** One table an `Aggregate` read joins, and how. Alias it when the `where` reads the table too. */
export interface AggregateJoin {
  type: 'inner' | 'left' | 'right';
  table: PgTable;
  on: SQL | undefined;
}

/**
 * How `selectFrom` reads a table beside a second one left-joined to it: each
 * row with the joined row, or null where `on` matched none. Alias the joined
 * table when the `where` reads the table itself too, in a correlated
 * subquery. The joined row takes no filter of its own here: what it must
 * satisfy is the caller's `on` and `where`.
 */
export interface LeftJoin<TJoined extends PgTable> {
  leftJoin: TJoined;
  on: SQL;
}

/**
 * How `selectFrom` reads rows a write in the same transaction is about to
 * decide on: in the writer's transaction, locked `for update` until it ends,
 * and in `lockOrder`, so two writers locking the same rows take them in one
 * order rather than deadlocking. A row another transaction changes while this
 * one waits is read as it committed, so a row that no longer matches drops out.
 */
export interface Locked {
  lockIn: WriterTransaction;
  lockOrder: AnyPgColumn;
}

/** A row read under a `LeftJoin`, and the row joined to it. */
export interface JoinedRow<TRow, TJoined> {
  row: TRow;
  joined: TJoined | null;
}

/**
 * A statement's rows read as a table: `source` is the parenthesised statement
 * and its alias, `fields` the columns read off it. For a read no one table
 * holds — a union across two — still built by `selectFrom`, under the
 * threshold.
 */
export interface Derived<TRow extends Record<string, unknown>> {
  source: SQL;
  fields: { [K in keyof TRow]: SQL<TRow[K]> };
}

/**
 * `withAudit`'s transaction, spelled from Drizzle's types rather than as
 * `typeof db`: the client is importable only where its exemption is pinned,
 * and a file holding named writes needs the transaction, not the client.
 */
export type WriterTransaction = PgTransaction<
  PostgresJsQueryResultHKT,
  Record<string, never>,
  ExtractTablesWithRelations<Record<string, never>>
>;

/**
 * What a marked table's named writes are built from (MB.198): the
 * transaction, the session, and the writer's own stamped insert and update,
 * which skip a soft-deleted row as every write does. `writerFor` hands it to
 * the repository file holding a table's finders, and spreads the writes that
 * file returns into the writer. The insert and the update return what the
 * named write's signature says, as the writer's own cast does.
 */
export interface WriterContext {
  tx: WriterTransaction;
  session: AuditSession;
  insert(table: PgTable, values: object): Promise<never>;
  update(table: PgTable, values: object, where: SQL | undefined): Promise<never>;
  softDelete(table: PgTable, where: SQL | undefined): Promise<never>;
}

/** What `withAudit` hands its callback: every write, stamped from the session. */
export interface AuditWriter {
  /** Insert one row, stamping created_* and updated_* from the session. */
  insert<TTable extends PgTable & Unscoped & Generic>(
    table: TTable,
    values: Writable<TTable>,
  ): Promise<TTable['$inferSelect'][]>;
  /** Insert one row into the workspace the proof names, filling `workspace_id` from it. */
  insertInWorkspace<TTable extends PgTable & WorkspaceScoped & Generic>(
    membership: Membership,
    table: TTable,
    values: WritableInWorkspace<TTable>,
  ): Promise<TTable['$inferSelect'][]>;
  /**
   * Update matching rows, stamping updated_* only — created_* is never touched.
   * A soft-deleted row never matches, here or in any update below.
   */
  update<TTable extends PgTable & Unscoped & Generic>(
    table: TTable,
    values: Partial<Writable<TTable>>,
    where: SQL,
  ): Promise<TTable['$inferSelect'][]>;
  /**
   * The same, naming the one row by its own id — for a table no proof scopes.
   * A service cannot build the `where` above: MB.33 bars it from importing
   * `drizzle-orm` at runtime.
   */
  updateById<TTable extends PgTable & Unscoped & Generic & Identified>(
    table: TTable,
    id: string,
    values: Partial<Writable<TTable>>,
  ): Promise<TTable['$inferSelect'][]>;
  /** The same, with `workspace_id = membership.workspaceId` ANDed onto the `where`. */
  updateInWorkspace<TTable extends PgTable & WorkspaceScoped & Generic>(
    membership: Membership,
    table: TTable,
    values: Partial<WritableInWorkspace<TTable>>,
    where: SQL,
  ): Promise<TTable['$inferSelect'][]>;
  /**
   * The same, naming the one row by its own id. A service cannot build the
   * `where` the method above wants — MB.33 bars it from importing
   * `drizzle-orm` at runtime — so the predicate every entity update needs is
   * built by the writer instead.
   */
  updateByIdInWorkspace<TTable extends PgTable & WorkspaceScoped & Generic & Identified>(
    membership: Membership,
    table: TTable,
    id: string,
    values: Partial<WritableInWorkspace<TTable>>,
  ): Promise<TTable['$inferSelect'][]>;
  /**
   * `updateByIdInWorkspace` for a table carrying `revision`, written only
   * while the row is still at `expectedRevision` (M13.16). A live row of the
   * proof's workspace that has moved on throws `StaleWrite` with its revision
   * now; `null` writes whatever the row holds, the client's choice to keep its
   * own version over another save. No live row of the proof's workspace with
   * this id answers `[]`, as the update above does, never `StaleWrite`, which
   * would tell another coven's reader that the row exists.
   */
  updateRevisioned<TTable extends PgTable & WorkspaceScoped & Generic & Identified & Revisioned>(
    membership: Membership,
    table: TTable,
    id: string,
    expectedRevision: number | null,
    values: Partial<WritableInWorkspace<TTable>>,
  ): Promise<TTable['$inferSelect'][]>;
  /**
   * Soft-delete matching rows: stamps deleted_*, leaving the row in place
   * (CLAUDE.md rule 4). A row already deleted never matches, here or below, so
   * it keeps the stamps of whoever deleted it.
   */
  softDelete<TTable extends PgTable & SoftDeletable & Unscoped & Generic>(
    table: TTable,
    where: SQL,
  ): Promise<TTable['$inferSelect'][]>;
  /** The same, scoped by the proof. */
  softDeleteInWorkspace<TTable extends PgTable & SoftDeletable & WorkspaceScoped & Generic>(
    membership: Membership,
    table: TTable,
    where: SQL,
  ): Promise<TTable['$inferSelect'][]>;
  /** The same, naming the one row by its own id, for `updateByIdInWorkspace`'s reason. */
  softDeleteByIdInWorkspace<
    TTable extends PgTable & SoftDeletable & WorkspaceScoped & Generic & Identified,
  >(
    membership: Membership,
    table: TTable,
    id: string,
  ): Promise<TTable['$inferSelect'][]>;
  /**
   * `softDelete`, naming the rows by their own ids — the soft-delete twin of
   * `findManyByIds`, for the reason `updateById` gives. An empty list deletes
   * nothing without a statement.
   */
  softDeleteByIds<TTable extends PgTable & SoftDeletable & Unscoped & Generic & Identified>(
    table: TTable,
    ids: readonly string[],
  ): Promise<TTable['$inferSelect'][]>;
  /**
   * Insert one row into the compendium tier of a two-tier table, filling
   * `workspace_id` with null — the site role's counterpart of
   * `insertInWorkspace`, under its proof.
   */
  insertInCompendium<TTable extends PgTable & TwoTier & Generic>(
    curator: Curator,
    table: TTable,
    values: WritableInWorkspace<TTable>,
  ): Promise<TTable['$inferSelect'][]>;
  /**
   * Update the one live compendium row with this id, stamping updated_* only.
   * A workspace's row, or a soft-deleted one, is not reached: nothing is
   * written and nothing returned.
   */
  updateByIdInCompendium<TTable extends PgTable & TwoTier & Generic & Identified>(
    curator: Curator,
    table: TTable,
    id: string,
    values: Partial<WritableInWorkspace<TTable>>,
  ): Promise<TTable['$inferSelect'][]>;
  /**
   * Sets the review mark of the one live compendium entry with this id: with
   * `reviewed`, by `curator`, now, in one statement that keeps a mark the entry
   * already has, so the original date and reviewer stand; without it, clears
   * the mark (M14.8). The review switch's alone: no other writer touches the
   * two columns.
   */
  setReviewInCompendium(curator: Curator, id: string, reviewed: boolean): Promise<IngredientRow[]>;
  /**
   * Moves the one live compendium row's `updated_at` with no column changed,
   * for a parent whose child rows just changed (MB.106). The `set_updated_at()`
   * trigger leaves an UPDATE that changed nothing alone, so this publishes
   * `app.touch_row` for its own statement to say the touch is meant. Reaches
   * the compendium tier only, on the same terms as the update above.
   */
  touchByIdInCompendium<TTable extends PgTable & TwoTier & Generic & Identified>(
    curator: Curator,
    table: TTable,
    id: string,
  ): Promise<TTable['$inferSelect'][]>;
  /** The same, for the one live row of the proof's workspace. */
  touchByIdInWorkspace<TTable extends PgTable & WorkspaceScoped & Generic & Identified>(
    membership: Membership,
    table: TTable,
    id: string,
  ): Promise<TTable['$inferSelect'][]>;
  /** Soft-delete the one live compendium row with this id, on the same terms. */
  softDeleteByIdInCompendium<
    TTable extends PgTable & TwoTier & SoftDeletable & Generic & Identified,
  >(
    curator: Curator,
    table: TTable,
    id: string,
  ): Promise<TTable['$inferSelect'][]>;
  /**
   * Hard-delete the compendium's slug retirements that have lapsed by `at`:
   * each redirect ended at its `expires_at`, so the row answers nothing and
   * is removed rather than tombstoned. Named for its one table, as the
   * provisional-account delete is, because the table carries `deleted_at`.
   */
  deleteLapsedSlugRetirements(
    curator: Curator,
    at: Date,
  ): Promise<(typeof retiredIngredientSlugs.$inferSelect)[]>;
  /**
   * Carry a curated form's new name onto the compendium's variants picking it
   * (M5.6a, MB.220): every live variant whose `form_id` is `formId`, of a
   * live compendium entry, takes `form` as its text. No slug moves and no
   * retirement is written, since a form is no part of an entry's identity or
   * address. A coven's variant, a deleted entry's, a dropped variant and one
   * picking another form are left alone and not returned. Named for its
   * tables, since the vocabulary module that renames a form may not name them.
   */
  carryFormRename(
    curator: Curator,
    formId: string,
    form: string,
  ): Promise<(typeof ingredientVariants.$inferSelect)[]>;
  /**
   * Carry a celestial body's or a sign's new name onto the compendium's lists (MB.95):
   * in every live compendium entry whose `list` holds an entry folding to
   * `from`, under the suggestions' fold, that entry becomes `to`, in its
   * place. Nothing else in the row moves, since a celestial body or a sign is no part
   * of an entry's identity or slug; a coven's ingredient and a deleted entry
   * are left alone and not returned. Named for its tables, as
   * `carryFormRename` is.
   */
  carryAstrologyRename(
    curator: Curator,
    list: AstrologyList,
    from: string,
    to: string,
  ): Promise<IngredientRow[]>;
  /**
   * Carry a curated deity's new name onto the compendium's links to it
   * (MB.132): every live `ingredient_deities` row whose `deity_id` is
   * `deityId` and whose ingredient is a live compendium entry takes `name`,
   * in its place. A coven's link, a deleted entry's, a dropped link and a
   * typed name are left alone and not returned; nothing of the entry itself
   * moves, since a deity is no part of its identity or slug. Named for its
   * tables, as `carryFormRename` is.
   */
  carryDeityRename(
    curator: Curator,
    deityId: string,
    name: string,
  ): Promise<(typeof ingredientDeities.$inferSelect)[]>;
  /**
   * Open a pause on admin role changes, stamped from the session (MB.62). No
   * row comes back while one is already open: the one-open index refuses a
   * second, and the call writes nothing rather than failing the transaction.
   */
  pauseAdminRoleChanges(admin: SiteAdmin): Promise<(typeof adminRoleChangePauses.$inferSelect)[]>;
  /**
   * End the open pause, stamping `ended_at` now and `ended_by` from the
   * session. No row comes back when none is open.
   */
  resumeAdminRoleChanges(admin: SiteAdmin): Promise<(typeof adminRoleChangePauses.$inferSelect)[]>;
  /**
   * The live admins, locked `for update` until the transaction ends (MB.59):
   * what a revoke counts before it writes, so two admins revoking each other
   * at once cannot both leave the other the last. A read, and in the writer
   * only because the lock must be taken in the transaction that writes.
   */
  lockLiveAdmins(admin: SiteAdmin): Promise<(typeof users.$inferSelect)[]>;
  /**
   * Soft-delete the proof's own workspace (M6.14), stamped from the session.
   * The `workspaces` row is the proof's `workspaceId` itself, since it has no
   * `workspace_id` column for `softDeleteInWorkspace` to scope on. Membership
   * rows are untouched. An empty result means the workspace was already deleted.
   */
  softDeleteWorkspace(membership: Membership): Promise<(typeof workspaces.$inferSelect)[]>;
  /**
   * Seat a user in a workspace at a role, under no proof: the row a proof is
   * minted from, so a workspace's creator (M6.7) and an invitee accepting
   * (M7.5) have none to write it under. The caller has decided the user may be
   * seated; stamped from the session.
   */
  insertMembership(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
    invitedBy?: string,
  ): Promise<(typeof workspaceMembers.$inferSelect)[]>;
  /**
   * Set the role of one live member of the proof's workspace (M9.14). The
   * workspace is the proof's, so another coven's row is out of reach; an
   * empty result means no such live member. Touches the role and the audit
   * stamps, never `joined_at`. The caller has run the last-owner guard.
   */
  updateMembershipRole(
    membership: Membership,
    userId: string,
    role: WorkspaceRole,
  ): Promise<(typeof workspaceMembers.$inferSelect)[]>;
  /**
   * Soft-delete one live member of the proof's workspace (M6.15), for a
   * removal and for a leave alike, stamped from the session. An empty result
   * means no such live member. The caller has checked the permission or that
   * the row is the caller's own, and run the last-owner guard.
   */
  softDeleteMembership(
    membership: Membership,
    userId: string,
  ): Promise<(typeof workspaceMembers.$inferSelect)[]>;
  /**
   * Bring a removed member back at `role` (M6.15; M7.5's accept calls it):
   * clears `deleted_at` and `deleted_by`, sets the role and restarts
   * `joined_at`. The one writer that touches a deleted row, so it reaches
   * only a deleted one: an empty result means the pair holds no removed row
   * (none was ever made, or it is live). Under no proof, as
   * `insertMembership` is. Always sets `invited_by`, to null when no sender
   * is given, so an earlier inviter never lingers.
   */
  reviveMembership(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
    invitedBy: string | null,
  ): Promise<(typeof workspaceMembers.$inferSelect)[]>;
  /**
   * The proof's workspace's live members, locked `for update` until the
   * transaction ends (M6.8): what the last-owner guard counts before a role
   * change or removal writes, so two owners stepping down at once cannot both
   * leave the other the last. A read, and in the writer only because the lock
   * must be taken in the transaction that writes.
   */
  lockLiveMembers(membership: Membership): Promise<(typeof workspaceMembers.$inferSelect)[]>;
  /**
   * Takes the proof's coven's stock lock until the transaction ends: a create
   * that adds a jar, a cupboard remove that counts them (M12.15), and the two
   * conversions that move them (M12.21, M12.23) queue on it, so none misses
   * another's write. Taken first, before any read or write. Per coven: another
   * coven's call is not held up.
   */
  lockCovenStock(membership: Membership): Promise<void>;
  /**
   * The live forms of the proof's coven's ingredient `ingredientId`, locked in
   * form-id order, read in the transaction so they include the ones this write
   * has just made. None for an ingredient that is not the coven's.
   */
  lockLiveVariants(membership: Membership, ingredientId: string): Promise<VariantRow[]>;
  /** The proof's coven's live jars of its ingredient `ingredientId`, locked in jar-id order. */
  lockJarsOfIngredient(membership: Membership, ingredientId: string): Promise<StockRow[]>;
  /**
   * The live steps, in live spells of the proof's coven, that lay any of
   * these forms, locked in step-id order until the transaction ends: what a
   * convert moves and checks for a spell that would hold one form twice
   * (M12.21). Private spells included, whoever wrote them; another coven's
   * steps never.
   */
  lockStepsOfVariants(
    membership: Membership,
    variantIds: readonly string[],
  ): Promise<SpellStepRow[]>;
  /**
   * Points these steps, each in a live spell of the proof's coven, at another
   * ingredient's form, stamped from the session, and answers the rows moved.
   * Nothing else on the step changes.
   */
  moveSteps(
    membership: Membership,
    stepIds: readonly string[],
    to: { ingredientId: string; variantId: string },
  ): Promise<SpellStepRow[]>;
  /**
   * Invite an address into the proof's workspace, with the role it names,
   * stamped from the session (M7.2; MB.202). The workspace is the proof's,
   * never the values'. The token is hashed here and only the hash is stored.
   * Only the columns an invitation starts with are written: it starts
   * pending, whatever a cast smuggled into `values`.
   */
  insertInvitation(
    membership: Membership,
    values: WorkspaceInvitationValues,
  ): Promise<InvitationRow[]>;
  /**
   * Invite an address to the site role it names, curator or admin, on the
   * site tier, where the workspace and the coven role are both null (MB.69;
   * MB.202; M11.20). On the same terms otherwise.
   */
  insertInvitation(admin: SiteAdmin, values: SiteInvitationValues): Promise<InvitationRow[]>;
  /**
   * Accept the pending invitation a link's token names, on either tier, as
   * the session's user, stamping `accepted_at` now and `accepted_by` from the
   * session. Under no proof, since the invitee holds neither a membership nor
   * the site role yet: the token is what admits, and the session's user must
   * hold the invited address, verified. No row comes back for a token naming
   * no pending invitation, or for a user whose live row holds another address
   * or holds it unverified.
   */
  acceptInvitation(token: string): Promise<InvitationRow[]>;
  /**
   * Accept the pending coven invitation `id` names, as the session's user:
   * `acceptInvitation` found by id, for the account page (M10.32). Under
   * no proof, for the same reason. No row comes back for an id on the site
   * tier, whose grant a link alone accepts, for one sent to another address or
   * to this one unverified, for one into a deleted coven, or for one that is
   * not pending.
   */
  acceptReceivedInvitation(id: string): Promise<InvitationRow[]>;
  /**
   * Decline the pending coven invitation `id` names, as the session's user,
   * stamping `declined_at` now (M10.34). Under no proof, for the accept's
   * reason, and matched as `acceptReceivedInvitation` is: no row comes back
   * for an id on the site tier, sent to another address or to this one
   * unverified, into a deleted coven, or not pending.
   */
  declineReceivedInvitation(id: string): Promise<InvitationRow[]>;
  /**
   * Revoke an open invitation in the proof's workspace, stamping
   * `revoked_at` now; `updated_by` is who revoked. Open is pending, or
   * declined and not yet removed, whatever its expiry (M10.34): Revoke on the
   * one, Remove on the other. No row comes back for one already accepted or
   * revoked, a pending one expired, or an id in another workspace or on the
   * site tier.
   */
  revokeInvitation(membership: Membership, id: string): Promise<InvitationRow[]>;
  /** The same on the site tier: a workspace's invitation is not reached. */
  revokeInvitation(admin: SiteAdmin, id: string): Promise<InvitationRow[]>;
  /**
   * Revoke every pending invitation to `email` in the proof's tier, stamping
   * `revoked_at` now: a repeat invitation replaces the one waiting (MB.269).
   * The proof's tier is its workspace for a `Membership` and the site tier for
   * a `SiteAdmin`, so the two never replace each other. The address is matched
   * in any case. An accepted, declined, revoked or lapsed row is left alone.
   */
  revokePendingInvitationsTo(membership: Membership, email: string): Promise<InvitationRow[]>;
  /** The same on the site tier. */
  revokePendingInvitationsTo(admin: SiteAdmin, email: string): Promise<InvitationRow[]>;
  /**
   * Hard-delete, for the join tables that carry no `deleted_at` (MB.34). A
   * table carrying one is rejected by the type, as is one carrying
   * `workspace_id`: no table is both today, and the one that is first adds its
   * proof-scoped counterpart rather than being hard-deleted unscoped. The rows
   * are named by `match`, every column of which they must hold; a list
   * matching nothing deletes nothing without a statement, and a match naming
   * no column is refused rather than emptying the table.
   */
  delete<TTable extends PgTable & HardDeletable & Unscoped & Generic>(
    table: TTable,
    match: ColumnMatch<TTable>,
  ): Promise<TTable['$inferSelect'][]>;
}

/**
 * What `delete` names its rows by: a value per column, or a list the column
 * is in, or `null` for a nullable column that must be null — the parent's
 * own category pairs beside a form's (MB.217). Values rather than an `SQL`
 * predicate, since a service may not build one (MB.33), and a join table
 * keyed on its pair needs no other comparison (MB.125). The stamps are not
 * columns to match on.
 */
export type ColumnMatch<TTable extends PgTable> = {
  [K in keyof Writable<TTable>]?:
    | NonNullable<Writable<TTable>[K]>
    | readonly NonNullable<Writable<TTable>[K]>[]
    | (null extends Writable<TTable>[K] ? null : never);
};

/** What a possible duplicate carries onto its edge: its trigram similarity to the name. */
export interface SimilarityScore {
  score: number;
}

/** What a list of ingredients is narrowed by. Each part is optional, and absent means no filter. */
export interface IngredientFilter {
  /** Word-similar (`<%`, at 0.5) to the label, the formal name or a live folk name, case- and accent-folded. */
  query?: string;
  /** Categories an entry carries, on itself or on a live form; `categoryMode` says how many of them. */
  categoryIds?: readonly string[];
  /** `all` (the default) needs every id in `categoryIds`; `any` needs at least one (M8.12). */
  categoryMode?: CategoryMode;
  /**
   * Any of these forms, not every one: an entry matches when one of its live
   * variants has a form in the list, both sides trimmed and lower-cased
   * (M11.22). Blank entries are skipped, and an empty list is no filter.
   */
  forms?: readonly string[];
  /**
   * The curated form one of an entry's live variants picked, by its `form_id`
   * (MB.167, MB.220): how a form's delete finds the entries holding it
   * (M5.6a). A uuid; the caller checks one first.
   */
  formId?: string;
  /**
   * Any of these celestial bodies: an entry matches when its
   * `celestialBodies` list holds one of them, compared under the
   * suggestions' fold (MB.162). How a celestial body's delete and rename find
   * the entries holding it (MB.95), with a one-item list. Blank entries are
   * skipped, and an empty list is no filter (M11.22).
   */
  celestialBodies?: readonly string[];
  /** Any of these signs, read from the entry's `zodiacSigns` as `celestialBodies` reads its list. */
  zodiacSigns?: readonly string[];
  /**
   * Any of these elements: an entry matches when its own `elements` list, or
   * a live variant's, holds one of them, alone or among others (M8.13, MB.157,
   * MB.215). A soft-deleted variant's list counts for nothing. An empty list
   * is no filter.
   */
  elements?: readonly IngredientElement[];
  /**
   * Any of these curated deities: an entry matches when it holds a live link
   * to one of them, by `ingredient_deities.deity_id` (MB.167, M11.22). How a
   * deity's delete finds the entries holding it (MB.132), with a one-item
   * list. Uuids; the caller checks them first. An empty list is no filter.
   */
  deityIds?: readonly string[];
  /**
   * `toxic`: the entry's own flag is on, or a live variant's is. `not_toxic`:
   * neither is. A soft-deleted variant's flag counts for nothing either way.
   * Absent means any (M11.22).
   */
  toxic?: 'toxic' | 'not_toxic';
  /**
   * A coven's list only (M9.7): `local` keeps the coven's own entries,
   * `compendium` the compendium entries it holds. Absent keeps both. The
   * compendium's own read ignores it.
   */
  source?: 'local' | 'compendium';
  /**
   * A coven's list only (M9.7): keep an entry when any live jar of the coven's
   * is not at 0, a jar with no quantity counting as held. The compendium's
   * own read ignores it.
   */
  inStock?: boolean;
  /**
   * A coven's list only (M9.8): keep an entry when any live jar of the coven's
   * is badged Out of Stock (at 0) or Low Stock (above 0, at or below a
   * threshold above 0). A jar with no quantity never is. The compendium's own
   * read ignores it.
   */
  lowStockOnly?: boolean;
  /** Only entries citing no live compendium reference: the admin's to-do list (MB.153). */
  withoutReferences?: boolean;
  /** Only entries with no live form: the admin's other to-do list, entries nobody can stock yet (M12.30). */
  withoutForms?: boolean;
  /** Only entries declaring this nomenclature (M5.5). */
  nomenclature?: NomenclatureKind;
  /**
   * The compendium's only (M14.8): true keeps the entries a curator has marked
   * reviewed, false the ones still needing review. Absent keeps both. The
   * service lets only a curator set it.
   */
  reviewed?: boolean;
  /**
   * The compendium only (M12.55): keep an entry when a live cupboard row of
   * any one of these covens names it. A proof each, so a coven the caller is
   * not in cannot be named; an empty list is no filter.
   */
  heldIn?: readonly Membership[];
  /**
   * The compendium only (M12.55, Not In): keep an entry when no live cupboard
   * row of any of these covens names it. A proof each, as `heldIn`; an empty
   * list is no filter.
   */
  notHeldIn?: readonly Membership[];
}

/** One facet value and how many entries the list would hold with it chosen (M12.3). */
export interface FacetCount<TValue extends string = string> {
  value: TValue;
  count: number;
}

/**
 * How many entries each value of each filter kind would list, under the rest
 * of the filter (M12.3). Forms are spelled as shown, deities and categories
 * are row ids, and the astrology kinds are the curated rows' names.
 */
export interface IngredientFacets {
  forms: FacetCount[];
  deities: FacetCount[];
  categories: FacetCount[];
  zodiacSigns: FacetCount[];
  celestialBodies: FacetCount[];
  elements: FacetCount<IngredientElement>[];
  toxic: FacetCount<'toxic' | 'not_toxic'>[];
}

/**
 * A coven's facets (M9.7): the seven kinds, and the two settings only a coven's
 * list has. `source` lists both values, zeros kept, in the enum's order;
 * `inStock` and `lowStockOnly` are how many entries the list would hold with the
 * switch on.
 * Each is counted with its own setting left out and every other kept.
 */
export interface WorkspaceIngredientFacets extends IngredientFacets {
  source: FacetCount<'local' | 'compendium'>[];
  inStock: number;
  lowStockOnly: number;
}

/**
 * The compendium's facets, and how many entries cite no live reference under
 * the rest of the filter: the No Refs switch's count (M12.3), the same with
 * the switch on or off. `withoutForms` is the same for entries with no live
 * form (M12.30). A coven's list has neither switch, so its facets do not carry
 * them.
 */
export interface CompendiumFacets extends IngredientFacets {
  withoutReferences: number;
  withoutForms: number;
  /**
   * How many entries are reviewed and how many need review, under the rest of
   * the filter (M14.8). The repository always counts them; the service answers
   * null to anyone but a curator, since the mark is the curators' alone.
   */
  reviewed: FacetCount<ReviewFacetValue>[] | null;
}

/** The Reviewed filter's two settings, as its facet counts them (M14.8). */
export type ReviewFacetValue = 'reviewed' | 'needs_review';

/**
 * What a compendium entry carries onto its edge: on a search, its rank — the
 * best of its matched fields' word similarity to the query, each times that
 * field's weight (`searchMatch`). Null on a browse. The position that orders
 * equal ranks is the key's alone, and never carried.
 */
export interface CompendiumScore {
  score: number | null;
}

/** Which of the substitute picker's two groups an entry is listed in (M12.19). */
export type SuggestionGroup = 'yours' | 'compendium';

/** What each row of the substitute picker carries beside its entry. */
export interface SuggestionGroupTag {
  group: SuggestionGroup;
}

/**
 * What an entry of a coven's ingredient list carries beside its rank: the
 * coven's live cupboard row for it, read by the list's own join, so
 * `Ingredient.cupboardEntry` is answered without a second read. Null for the
 * coven's own entries (M12.18).
 */
export interface WorkspaceListEdge extends CompendiumScore {
  cupboardEntry: CupboardEntryRow | null;
}

/**
 * The columns a list filters, sorts and counts that a coven's cupboard row
 * may restate (M12.18): each the row's value where it holds one, else the
 * entry's. On the compendium's own list they are the entry's columns, and
 * there is no join.
 */
export interface ListColumns {
  name: SortPart;
  elements: SQLWrapper;
  celestialBodies: SQLWrapper;
  zodiacSigns: SQLWrapper;
  /** The cupboard row's join, which every read of the columns needs. */
  leftJoined?: LeftJoin<PgTable>;
}

/**
 * An ingredient's identity as a write gives it: the two parts its
 * `identity_key` is built from, the formal name and the label it falls back
 * to. Never the form, which is a variant's since MB.215.
 */
export interface IngredientIdentity {
  name: string;
  canonicalName?: string | null;
}

/** A vocabulary an admin list pages: every one, filed under a group or under none. */
export type ListedVocabulary = FlatTable | ItemTable;

/** A vocabulary a member's autofill suggests from: the flat ones, and the two an ingredient picks. */
export type SuggestingVocabulary = FlatTable | PickedTable;

/**
 * Where a vocabulary's in-use values are written: a `list` of `ingredients`
 * whose entries are each one (MB.136), or a `child` table's live rows, each
 * holding one in its `value` column — a deity link's `name` (MB.167), a
 * variant's `form` (MB.220).
 */
export type InUseSource =
  | { list: AnyPgColumn }
  | { child: typeof ingredientDeities; value: typeof ingredientDeities.name }
  | { child: typeof ingredientVariants; value: typeof ingredientVariants.form };

/** A curated row, or a value written on an ingredient that matches none. */
export interface VocabularySuggestion {
  value: string;
  /** The curated row's; a value in use outside the vocabulary has none. */
  description: string | null;
  curated: boolean;
}

/** A form suggestion, which alone carries a group and who already claims it. */
export interface FormSuggestion extends VocabularySuggestion {
  /** The curated row's, which a pick sends (MB.167); a value in use outside the vocabulary has none. */
  id: string | null;
  /** The curated row's group, which tells two same-named forms apart; none in use. */
  group: string | null;
  /** The curated row's group's icon name; none for a group without one and for a value in use. */
  icon: FormGroupIcon | null;
  claimants: Claimant[];
}

/**
 * A deity suggestion, which carries its tradition as a form's carries its
 * group, and no claimants: a deity is no part of an ingredient's identity.
 */
export interface DeitySuggestion extends VocabularySuggestion {
  /** The curated row's, which a pick sends (MB.167); a value in use outside the vocabulary has none. */
  id: string | null;
  /** The curated row's tradition, which tells two same-named deities apart; none in use. */
  tradition: string | null;
  /**
   * The other name the query matched (M14.23), which the deity's own name does
   * not show; none when its name matched, or it was found another way.
   */
  matchedName: string | null;
}

/** An in-scope ingredient already holding a suggested value. */
export interface Claimant {
  name: string;
  /** Its formal name; an entry whose nomenclature is `none` or `unknown` has none. */
  canonicalName: string | null;
}

/** One row of a suggestion statement, as `readSuggestionPage` reads it. */
export interface SuggestionRow {
  /** 0 a curated name match, 1 a curated description match, 2 in use outside the vocabulary. */
  tier: number;
  /** The curated row's id; none in tier 2. */
  id: string | null;
  value: string;
  description: string | null;
  group: string | null;
  /** The form group's icon; none for a deity, a tradition or a value in use. */
  icon: FormGroupIcon | null;
  /** A deity's other name the query matched; none for anything else. */
  matchedName: string | null;
  fold: string;
  /** The curated row's id; an in-use value's fold, which its tier holds once. */
  tiebreak: string;
  claimants: Claimant[];
}

/** A common name already in use, and who answers to it. */
export interface CommonNameSuggestion {
  value: string;
  claimants: Claimant[];
}

/** A `references` row, compendium or coven's, as a finder returns it. */
export type ReferenceRow = typeof references.$inferSelect;

/** A `reference_links` row, as a finder returns it. */
export type ReferenceLinkRow = typeof referenceLinks.$inferSelect;

/** A live link, and the live reference it cites. */
export interface CitingLink {
  link: ReferenceLinkRow;
  reference: ReferenceRow;
}

/** The column `unread-columns.ts` leaves out of an `ingredients` row read. */
export type UnreadIngredientColumn = 'curatorReviewedBy';

/**
 * An `ingredients` row, compendium entry or coven's, as a finder returns it: without the
 * name of the curator who reviewed it, which no finder reads with the row
 * (`unread-columns.ts`; M14.8). The review date is on the row.
 */
export type IngredientRow = Omit<typeof ingredients.$inferSelect, UnreadIngredientColumn>;

/**
 * A row as the generic finders read it: the table's whole row, less any column
 * `unread-columns.ts` keeps out of reads. Writers' `returning()` still hold
 * the whole row (M14.8).
 */
export type ReadRow<TTable extends PgTable> = TTable extends typeof ingredients
  ? IngredientRow
  : TTable['$inferSelect'];

/** When a curator last marked a compendium entry reviewed, as the curator's own read returns it. */
export interface CompendiumReviewRow {
  /** `null` once the mark is cleared: the entry needs review. */
  reviewedAt: Date | null;
}

/** An `inventory_items` row — one coven's jar of one form — as a finder or a write returns it. */
export type StockRow = typeof inventoryItems.$inferSelect;

/** A `workspace_compendium_entries` row — a compendium entry's presence in one coven's cupboard (M12.13) — as a finder or a write returns it. */
export type CupboardEntryRow = typeof workspaceCompendiumEntries.$inferSelect;

/** A form of an ingredient, as a finder or a write returns it. */
export type VariantRow = typeof ingredientVariants.$inferSelect;

/** One `spell_steps` row, a step of a spell, as the writer reads it. */
export type SpellStepRow = typeof spellSteps.$inferSelect;

/** A redirect from a slug an entry moved off: the entry, at its current slug, and when it ends. */
export interface SlugRedirect {
  entry: IngredientRow;
  expiresAt: Date;
}

/** An `invitations` row, either tier, as a finder or a write returns it. */
export type InvitationRow = typeof invitations.$inferSelect;

/** The live coven a workspace invitation names, as the invited account may be told it: two fields, never the row. */
export interface InvitedCoven {
  name: string;
  slug: string;
}

/** A live coven as the account it invited may be told it, for the `/coven` landing: three fields, never the row. */
export interface ReceivedInvitationCoven {
  id: string;
  name: string;
  slug: string;
}

/** The sender of an invitation, as its invitee may read them: an id and a name. */
export interface ReceivedInvitationInviter {
  id: string;
  name: string;
}

/** A site role an invitation may grant: `curator` or `admin`, as the CHECK has it (M11.20). */
export type InvitableSiteRole = Exclude<NonNullable<InvitationRow['siteRole']>, 'user'>;

/**
 * A site-tier invitation, which grants the site role it names: the workspace
 * and the coven role both null, as the `invitations_tier` CHECK makes them
 * together (MB.201), and the site role set, as `invitations_site_role_tier`
 * makes it (M11.20).
 */
export type SiteInvitationRow = InvitationRow & {
  workspaceId: null;
  role: null;
  siteRole: InvitableSiteRole;
};

/** A role an invitation may grant: every workspace role but `owner`, as the CHECK has it. */
export type InvitableRole = Exclude<NonNullable<InvitationRow['role']>, 'owner'>;

/** What an invitation on either tier starts with; the expiry defaults to seven days out. */
type InvitationValues = Pick<typeof invitations.$inferInsert, 'email' | 'expiresAt' | 'note'> & {
  /** The link's token, never stored: the writer stores its hash. */
  token: string;
};

/** What a site-tier invitation starts with: the same, and the site role it grants. */
export type SiteInvitationValues = InvitationValues & { siteRole: InvitableSiteRole };

/** What a workspace invitation starts with: the same, and the coven role it grants. */
export type WorkspaceInvitationValues = InvitationValues & { role: InvitableRole };

/** What the admin invitation list is narrowed by (MB.115). Each part is optional, and absent means no filter. */
export interface SiteInvitationFilter {
  /** A substring of the invited address, case-insensitive, its `%` and `_` read literally. */
  email?: string;
  /** Only the invitations that lapse within this many hours of the database's `now()`. */
  expiresWithinHours?: number;
}

/** How a page of the grimoire is ordered and narrowed (M10.9). */
export interface GrimoireQuery {
  order: (typeof GRIMOIRE_ORDERS)[number];
  /** Only the spells of this status; absent means both. */
  status?: (typeof spells.$inferSelect)['status'];
  /**
   * Only the spells whose title or intent holds this text as a word or part of
   * one, accents and case set aside (M10.11); absent or blank means no search.
   * It narrows and leaves the order as asked.
   */
  query?: string;
  /** Only the spells assigned these categories, by id; absent or empty means no filter. */
  categoryIds?: readonly string[];
  /** Whether a spell needs every chosen category ('all', the default) or any of them. */
  categoryMode?: CategoryMode;
}

/** What the admin user list is narrowed by (MB.52). Each part is optional, and absent means no filter. */
export interface UserFilter {
  /** A substring of the name or the email, case-insensitive, its `%` and `_` read literally. */
  query?: string;
  /** Only the users who may not yet create a workspace: M5.8's to-do list. */
  awaitingApproval?: boolean;
  /** Only the users holding this site role (M5.8, on the owner's review). */
  role?: (typeof users.$inferSelect)['role'];
}

/** What the privilege ledger is narrowed by (MB.199). Each part is optional, and absent means no filter. */
export interface PrivilegeChangeFilter {
  /** Only the changes to this user's privileges. */
  userId?: string;
  /** Only the changes to this privilege. */
  privilege?: (typeof userPrivilegeChanges.$inferSelect)['privilege'];
  /**
   * Only the changes to a live user whose name or email holds this,
   * case-insensitively, its `%` and `_` read literally, as the user list's
   * `query` matches.
   */
  query?: string;
}

/** What the admin category list is narrowed by (MB.178). Each part is optional, and absent means no filter. */
export interface CategoryFilter {
  /** A substring of the name, case-insensitive, its `%` and `_` read literally. */
  query?: string;
  /** Only the categories filed under this group. */
  groupId?: string;
}

/** An ingredient list a curated astrology vocabulary's values are written to, by its property name. */
export type AstrologyList = 'celestialBodies' | 'zodiacSigns';

/** One of the two astrology vocabularies, flat and alike (MB.95). */
export type AstrologyVocabulary = FlatTable;

/** What an admin astrology list is narrowed by (MB.95): a name fragment, as the forms' list is. */
export interface AstrologyValueFilter {
  /** A substring of the name, case-insensitive, its `%` and `_` read literally. */
  query?: string;
}

/** What the admin form list is narrowed by, as `CategoryFilter` narrows the categories. Each part is optional, and absent means no filter. */
export interface IngredientFormValueFilter {
  /** A substring of the name, case-insensitive, its `%` and `_` read literally. */
  query?: string;
  /** Only the forms filed under this group. */
  groupId?: string;
}

/**
 * What the admin deity list is narrowed by (MB.132), as `IngredientFormValueFilter`
 * narrows the forms. Each part is optional, and absent means no filter.
 */
export interface DeityFilter {
  /** A substring of the name, case-insensitive, its `%` and `_` read literally. */
  query?: string;
  /** Only the deities filed under this tradition. */
  traditionId?: string;
}

/**
 * What an admin group list is narrowed by (MB.115): the deity traditions
 * today, and the category and form groups if their pages take the search too.
 * Absent means no filter.
 */
export interface GroupFilter {
  /** A substring of the name, case-insensitive, its `%` and `_` read literally. */
  query?: string;
}

/** A user's display name, without the rest of the row: what a co-member may read (MB.10). */
export interface UserName {
  id: string;
  name: string;
}

/** One provider account linked to a user, without the tokens its row holds. */
export interface LinkedProvider {
  userId: string;
  providerId: string;
}

/** One live compendium entry's address, as the sitemap and `llms.txt` list it (MB.84). */
export interface CompendiumSlugEntry {
  slug: string;
  name: string;
  canonicalName: string | null;
  /** The entry's own description, for `llms.txt` notes (M12.2); the sitemap ignores it. */
  description: string | null;
  /** When the entry last really changed: its `updated_at` (MB.106). */
  lastModified: Date;
}
