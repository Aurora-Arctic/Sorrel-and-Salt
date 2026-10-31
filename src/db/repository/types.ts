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
import type { spellWorkingDeductions } from '../../modules/grimoire/schema/spell-working-deductions';
import type { spellWorkingParticipants } from '../../modules/grimoire/schema/spell-working-participants';
import type { spellWorkings } from '../../modules/grimoire/schema/spell-workings';
import type { GRIMOIRE_ORDERS, spells } from '../../modules/grimoire/schema/spells';
import type { Membership, WorkspaceRole } from '@/modules/coven';
import type { Curator, SiteAdmin } from '@/modules/identity';
import type { Cursor, PageRequest } from '../../lib/types';
import type { AuditSession, Generic } from '../types';
import type { FlatTable, ItemTable, PickedTable } from '../vocabularies';
import type { FormGroupIcon } from '../../modules/vocabulary/schema/form-group-icons';

// The repository's types: the table shapes a finder or writer admits, `selectFrom`'s options,
// the writer `withAudit` hands out, and the finders' arguments and rows. The index re-exports
// the writer, `SortPart` and the finders' arguments and rows; the rest stays in the folder.

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

// A scoped table whose `workspace_id` is nullable has a second, compendium tier where it is null
// (`ingredients`, `retired_ingredient_slugs`); only such a table takes the compendium-tier
// writes, under a `Curator` (which a `SiteAdmin` also is).
export type TwoTier = { workspaceId: AnyPgColumn<{ notNull: false }> };

// A table goes through exactly one finder (claude-docs/db/spell-visibility.md, "Spell visibility").
// `spells` has a per-row reader rule, so `NotVisibilityScoped` keeps it off the generic scoped finders.
// Its join tables carry `spell_id` and no workspace: `NotSpellScoped` keeps them off the unscoped finders.
export type NotVisibilityScoped = { visibility?: never };
export type SpellScoped = { spellId: AnyPgColumn };
export type NotSpellScoped = { spellId?: never };

// `ingredient_folk_names` and `ingredient_categories` carry `ingredient_id` and no workspace, so they would pass as
// `Unscoped` while holding a coven's rows: `NotIngredientScoped` keeps them off the unscoped finders,
// and `findManyOfIngredients` reads them under the parent's tier.
export type IngredientScoped = { ingredientId: AnyPgColumn };
export type NotIngredientScoped = { ingredientId?: never };

// `ingredient_categories` and `ingredient_substitutes` also carry `variant_id`, null on the ingredient's own rows.
// `findManyOfVariants` reads a form's rows under its ingredient's tier; `findManyOfIngredients` reads
// the ingredient's own, `variant_id IS NULL`.
export type VariantScoped = { variantId: AnyPgColumn };

// A table written only through its own named calls carries the schema file's `namedWrites` mark, and every
// generic method below takes `Generic` and so refuses it (claude-docs/db/write-path.md, "Table marks").

/** A table with a surrogate key, which is every one but the two hard-deleted join tables. */
export type Identified = { id: AnyPgColumn };

// A table carrying `revisionColumn()`, the counter `bump_revision()` moves on every update and a revisioned write checks.
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
 * One part of a page's sort, always ascending: a column, or an expression and the type its cursor text casts back to.
 * An expression that can be NULL is the caller's bug (see `SortColumn`); a descending part is written negated.
 */
export type SortPart = SortColumn | { expression: SQL; type: string };

/** A list's key, and what reading it joins and is read under: what its pages and its count share. */
export interface KeyOrder {
  sort: readonly SortPart[];
  id: AnyPgColumn;
  /** A parenthesised, aliased statement joined to the table, which a sort part or the `where` may read. */
  join?: { source: SQL; on: SQL };
  /**
   * A table left-joined after `join`, null where `on` matched none, which a sort part or the `where` may read.
   * A page carries the joined row onto each entry as `joined`; `on` holds the joined table's own filters.
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
 * How `selectFrom` counts a keyset list rather than paging it: every row the `where` holds (a page's without its bounds),
 * and how many come before `start` in `count`'s order. The read takes the key's join and threshold, no order and no limit.
 */
export interface KeysetCount {
  count: KeyOrder;
  /** A page's first row. None on an empty page, whose `countBefore` is null. */
  start: Cursor | undefined;
}

/** One field a `weightedSearch` scores: its own `UNION ALL` arm. */
export interface SearchField {
  /** The listed row the field belongs to, which the search joins on. */
  id: AnyPgColumn;
  /** The text matched and scored. */
  text: AnyPgColumn;
  /** What a match here counts towards the rank, against the other fields. */
  weight: number;
  /** The relation the arm reads, the field's table or an alias of it. */
  from: SQLWrapper;
  /** What else a row must be to count: live, or in the reader's coven. */
  live?: SQL;
}

/** A best-match search, as `weightedSearch` builds it: the join, and each joined row's rank and position. */
export interface WeightedSearch {
  join: { source: SQL; on: SQL };
  score: SQL<number>;
  position: SQL<number>;
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
   * The character `text` holds the query verbatim from (folded as `contains` reads it), or the largest `integer` where it holds none:
   * orders equal scores earliest first, a fuzzy hit last. Never null, since a keyset part may not be.
   */
  position: (text: AnyPgColumn) => SQL<number>;
}

/**
 * How `selectFrom` runs a trigram match: `%` and `<%` in its `where` mean `SIMILARITY_THRESHOLD` and `WORD_SIMILARITY_THRESHOLD`,
 * and the first `limit` rows come back in `orderBy`'s order. Never `similarity(a, b) > n` in the `where`: no trigram index answers
 * a function call (claude-docs/db/fuzzy-matching.md, "Fuzzy matching").
 */
export interface Similarity {
  orderBy: SQL[];
  limit: number;
}

/**
 * How `selectFrom` tallies rows rather than reading them: the `aggregate` values, one row per `groupBy` group (one row overall without),
 * under `over`'s search join and threshold, so it tallies the rows that list's pages hold.
 * Each value is read as the driver returns it, so a count is cast in SQL rather than mapped.
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
 * How `selectFrom` reads a table beside a second one left-joined to it: each row with the joined row, or null where `on` matched none.
 * The joined row takes no filter of its own, only the caller's `on` and `where`; alias it when a correlated `where` reads the table too.
 */
export interface LeftJoin<TJoined extends PgTable> {
  leftJoin: TJoined;
  on: SQL;
}

/**
 * How `selectFrom` reads rows a write in the same transaction is about to decide on: in the writer's transaction, locked `for update`,
 * and in `lockOrder` so two writers take the same rows in one order rather than deadlocking.
 * A row another transaction changed while this one waited is read as committed, so one that no longer matches drops out.
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
 * A statement's rows read as a table: `source` is the parenthesised statement and its alias, `fields` the columns read off it.
 * For a read no one table holds, such as a union across two, still built by `selectFrom` under the threshold.
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
 * What a marked table's named writes are built from: the transaction, the session, and the writer's own stamped insert, update and soft delete,
 * which skip a soft-deleted row as every write does and return what the named write's signature says.
 * `writerFor` hands it to the file holding a table's finders and spreads the writes that file returns into the writer.
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
   * The same, naming the one row by its own id, for a table no proof scopes: a service cannot build the `where` above,
   * as it may not import `drizzle-orm` at runtime.
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
   * The same, naming the one row by its own id: a service may not import `drizzle-orm` at runtime,
   * so the writer builds the predicate every entity update needs.
   */
  updateByIdInWorkspace<TTable extends PgTable & WorkspaceScoped & Generic & Identified>(
    membership: Membership,
    table: TTable,
    id: string,
    values: Partial<WritableInWorkspace<TTable>>,
  ): Promise<TTable['$inferSelect'][]>;
  /**
   * `updateByIdInWorkspace` for a table carrying `revision`, written only while the row is at `expectedRevision`: a live row that has moved on
   * throws `StaleWrite` with its revision now; `null` writes whatever the row holds. No live row of the proof's workspace answers `[]`, never
   * `StaleWrite`, which would tell another coven's reader the row exists (claude-docs/db/write-path.md, "Writer contracts and filter fields").
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
   * `updateByIdInCompendium` for a table carrying `revision`, with `updateRevisioned`'s contract: a live compendium row that has moved
   * past `expectedRevision` throws `StaleWrite`, `null` writes whatever the row holds, and no live compendium row answers `[]`.
   */
  updateRevisionedInCompendium<
    TTable extends PgTable & TwoTier & Generic & Identified & Revisioned,
  >(
    curator: Curator,
    table: TTable,
    id: string,
    expectedRevision: number | null,
    values: Partial<WritableInWorkspace<TTable>>,
  ): Promise<TTable['$inferSelect'][]>;
  /**
   * Sets the review mark of the one live compendium entry: with `reviewed`, by `curator`, now, in one statement that keeps a mark the entry
   * already has (the original date and reviewer stand); without it, clears the mark. The only writer of those two columns.
   */
  setReviewInCompendium(curator: Curator, id: string, reviewed: boolean): Promise<IngredientRow[]>;
  /**
   * Moves the one live compendium row's `updated_at` with no column changed, for a parent whose child rows just changed.
   * The `set_updated_at()` trigger ignores an UPDATE that changed nothing, so this publishes `app.touch_row` to say the touch is meant.
   * Compendium tier only.
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
   * Hard-delete the compendium's slug retirements that have lapsed by `at` (each redirect ended at its `expires_at`).
   * Named for its one table, as the provisional-account delete is, because the table carries `deleted_at`.
   */
  deleteLapsedSlugRetirements(
    curator: Curator,
    at: Date,
  ): Promise<(typeof retiredIngredientSlugs.$inferSelect)[]>;
  /**
   * Carry a curated form's new name onto the compendium's variants: every live variant of a live compendium entry whose `form_id` is `formId`
   * takes `form` as its text. No slug moves and no retirement is written; a coven's variant, a deleted entry's, a dropped variant and one picking
   * another form are left alone. Named for its tables, since the vocabulary module may not name them.
   */
  carryFormRename(
    curator: Curator,
    formId: string,
    form: string,
  ): Promise<(typeof ingredientVariants.$inferSelect)[]>;
  /**
   * Carry a celestial body's or sign's new name onto the compendium's lists: in every live compendium entry whose `list` holds an entry folding to
   * `from` (the suggestions' fold), that entry becomes `to`, in place. Nothing else in the row moves; a coven's ingredient and a deleted entry
   * are left alone. Named for its tables, as `carryFormRename` is.
   */
  carryAstrologyRename(
    curator: Curator,
    list: AstrologyList,
    from: string,
    to: string,
  ): Promise<IngredientRow[]>;
  /**
   * Carry a curated deity's new name onto the compendium's links to it: every live `ingredient_deities` row with this `deity_id` whose ingredient
   * is a live compendium entry takes `name`. A coven's link, a deleted entry's, a dropped link and a typed name are left alone;
   * nothing of the entry moves. Named for its tables, as `carryFormRename` is.
   */
  carryDeityRename(
    curator: Curator,
    deityId: string,
    name: string,
  ): Promise<(typeof ingredientDeities.$inferSelect)[]>;
  /**
   * Open a pause on admin role changes, stamped from the session. No row comes back while one is open:
   * the one-open index refuses a second, and the call writes nothing rather than failing the transaction.
   */
  pauseAdminRoleChanges(admin: SiteAdmin): Promise<(typeof adminRoleChangePauses.$inferSelect)[]>;
  /**
   * End the open pause, stamping `ended_at` now and `ended_by` from the
   * session. No row comes back when none is open.
   */
  resumeAdminRoleChanges(admin: SiteAdmin): Promise<(typeof adminRoleChangePauses.$inferSelect)[]>;
  /**
   * The live admins, locked `for update` until the transaction ends: what a revoke counts before it writes, so two admins revoking each other
   * at once cannot both leave the other the last. A read, in the writer because the lock must be taken in the writing transaction.
   */
  lockLiveAdmins(admin: SiteAdmin): Promise<(typeof users.$inferSelect)[]>;
  /**
   * Soft-delete the proof's own workspace, stamped from the session; the `workspaces` row is the proof's `workspaceId` (it has no `workspace_id` column).
   * Membership rows are untouched. An empty result means the workspace was already deleted.
   */
  softDeleteWorkspace(membership: Membership): Promise<(typeof workspaces.$inferSelect)[]>;
  /**
   * Seat a user in a workspace at a role, under no proof: the row a proof is minted from, so a workspace's creator and an invitee accepting
   * have none to write it under. The caller has decided the user may be seated; stamped from the session.
   */
  insertMembership(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
    invitedBy?: string,
  ): Promise<(typeof workspaceMembers.$inferSelect)[]>;
  /**
   * Set the role of one live member of the proof's workspace; an empty result means no such live member. Touches the role and the audit stamps,
   * never `joined_at`. The caller has run the last-owner guard.
   */
  updateMembershipRole(
    membership: Membership,
    userId: string,
    role: WorkspaceRole,
  ): Promise<(typeof workspaceMembers.$inferSelect)[]>;
  /**
   * Set the role of one live member of a workspace named by id, under no proof, as `insertMembership` is: a site admin's seat in the demo
   * coven is written by an identity service that holds no membership of it. An empty result means no such live member.
   * The caller has decided the seat may change.
   */
  setSeatRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
  ): Promise<(typeof workspaceMembers.$inferSelect)[]>;
  /**
   * Soft-delete one live member of the proof's workspace, for a removal and a leave alike, stamped from the session; an empty result means
   * no such live member. The caller has checked the permission (or that the row is its own) and run the last-owner guard.
   */
  softDeleteMembership(
    membership: Membership,
    userId: string,
  ): Promise<(typeof workspaceMembers.$inferSelect)[]>;
  /**
   * Bring a removed member back at `role`: clears `deleted_at` and `deleted_by`, sets the role, restarts `joined_at`, and always sets `invited_by`
   * (null when no sender is given). The one writer that touches a deleted row, so an empty result means the pair holds no removed row.
   * Under no proof, as `insertMembership` is.
   */
  reviveMembership(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
    invitedBy: string | null,
  ): Promise<(typeof workspaceMembers.$inferSelect)[]>;
  /**
   * The proof's workspace's live members, locked `for update` until the transaction ends: what the last-owner guard counts before a role change
   * or removal writes, so two owners stepping down at once cannot both leave the other the last. A read, in the writer for the lock's sake.
   */
  lockLiveMembers(membership: Membership): Promise<(typeof workspaceMembers.$inferSelect)[]>;
  /**
   * Takes the proof's coven's stock lock until the transaction ends: a jar-adding create, a cupboard remove that counts jars, and the two conversions
   * that move them queue on it, so none misses another's write. Taken first, before any read or write; another coven's call is not held up.
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
   * Takes up to `amount` (in the jar's own unit) out of the proof's coven's live jar, never below zero, and returns what it took: the one path that
   * decrements stock, so a completed working's deduction joins the working's transaction and cannot race another (M13.5). The jar is locked first,
   * so the amount read is the amount written. A jar kept without an amount, or not the coven's, gives `taken: 0`.
   */
  decrementStock(
    membership: Membership,
    inventoryItemId: string,
    amount: number,
  ): Promise<{ taken: number }>;
  /**
   * The live steps, in live spells of the proof's coven, that lay any of these forms, locked in step-id order until the transaction ends:
   * what a convert moves and checks for a spell that would hold one form twice. Private spells included; another coven's steps never.
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
   * Marks one spell of the proof's coven deleted, stamped from the session, and answers the row, or
   * `[]` for a spell the proof cannot reach: another coven's, another member's private one, or one
   * already deleted. The reader's rule is in the WHERE; its steps are `softDeleteStepsOfSpell`'s.
   */
  softDeleteSpell(membership: Membership, spellId: string): Promise<SpellRow[]>;
  /**
   * Marks a working complete, stamped from the session, and answers the row, or `[]` for a working the proof cannot reach or one
   * already complete (the draft check is in the UPDATE, so two completions cannot both land).
   */
  completeWorking(membership: Membership, workingId: string): Promise<WorkingRow[]>;
  /**
   * Replaces a working's participants with these, in this order, and answers the rows written, or `[]` for a working the proof
   * cannot reach. The table keeps no tombstone, so the old rows are removed.
   */
  replaceWorkingParticipants(
    membership: Membership,
    workingId: string,
    participants: readonly WorkingParticipantValue[],
  ): Promise<WorkingParticipantRow[]>;
  /**
   * Marks every live working of one of the proof's coven's spells deleted, whoever recorded it and whatever its visibility, stamped
   * from the session; called beside `softDeleteSpell` in its transaction.
   */
  softDeleteWorkingsOfSpell(membership: Membership, spellId: string): Promise<WorkingRow[]>;
  /**
   * Marks a spell's live steps deleted, stamped from the session, and answers them. Scoped through
   * the spell to the proof's coven; called beside `softDeleteSpell` in its transaction, never alone.
   */
  softDeleteStepsOfSpell(membership: Membership, spellId: string): Promise<SpellStepRow[]>;
  /**
   * Invite an address into the proof's workspace with the role it names, stamped from the session; the workspace is the proof's, never the values'.
   * The token is hashed here and only the hash stored. Only the columns an invitation starts with are written, so it starts pending
   * whatever a cast smuggled into `values`.
   */
  insertInvitation(
    membership: Membership,
    values: WorkspaceInvitationValues,
  ): Promise<InvitationRow[]>;
  /**
   * Invite an address to the site role it names (curator or admin), on the site tier, where the workspace and the coven role are both null.
   * On the same terms otherwise.
   */
  insertInvitation(admin: SiteAdmin, values: SiteInvitationValues): Promise<InvitationRow[]>;
  /**
   * Insert a batch of cards (a whole number of sheets) in one statement, on the site tier's proof: one row per token, hashed here, sharing the batch id and the
   * expiry, with no address, coven or role.
   */
  insertInvitationCards(admin: SiteAdmin, values: CardInvitationValues): Promise<InvitationRow[]>;
  /** Revoke every pending card of the batch. An accepted card is the record of an arrival and is left untouched. */
  revokeInvitationCardBatch(admin: SiteAdmin, batchId: string): Promise<InvitationRow[]>;
  /**
   * Accept the pending invitation a link's token names, on either tier, as the session's user: stamps `accepted_at` and `accepted_by`.
   * Under no proof, since the invitee holds neither membership nor site role yet; the token admits, and the user must hold the invited address, verified.
   * No row comes back for a token naming no pending invitation, or a user whose live row holds another address or holds it unverified.
   * A card names no address: any verified account is admitted, once.
   */
  acceptInvitation(token: string): Promise<InvitationRow[]>;
  /**
   * Accept the pending coven invitation `id` names, as the session's user: `acceptInvitation` found by id, for the account page, under no proof.
   * No row comes back for an id on the site tier (a link alone accepts it), one sent to another address or to this one unverified,
   * one into a deleted coven, or one not pending.
   */
  acceptReceivedInvitation(id: string): Promise<InvitationRow[]>;
  /**
   * Decline the pending coven invitation `id` names, as the session's user, stamping `declined_at`; under no proof and matched as
   * `acceptReceivedInvitation` is: no row for a site-tier id, another address, this one unverified, a deleted coven, or a non-pending one.
   */
  declineReceivedInvitation(id: string): Promise<InvitationRow[]>;
  /**
   * Revoke an open invitation in the proof's workspace, stamping `revoked_at`; `updated_by` is who revoked. Open is pending, or declined and not
   * yet removed, whatever its expiry. No row comes back for one accepted or revoked, a pending one expired, or an id in another workspace or on the site tier.
   */
  revokeInvitation(membership: Membership, id: string): Promise<InvitationRow[]>;
  /** The same on the site tier: a workspace's invitation is not reached. */
  revokeInvitation(admin: SiteAdmin, id: string): Promise<InvitationRow[]>;
  /**
   * Revoke every pending invitation to `email` in the proof's tier (its workspace for a `Membership`, the site tier for a `SiteAdmin`, so the two never
   * replace each other), stamping `revoked_at`: a repeat invitation replaces the one waiting. The address is matched in any case;
   * an accepted, declined, revoked or lapsed row is left alone.
   */
  revokePendingInvitationsTo(membership: Membership, email: string): Promise<InvitationRow[]>;
  /** The same on the site tier. */
  revokePendingInvitationsTo(admin: SiteAdmin, email: string): Promise<InvitationRow[]>;
  /**
   * Hard-delete, for the join tables that carry no `deleted_at`. A table carrying one is rejected by the type, as is one carrying `workspace_id`.
   * Rows are named by `match`, every column of which they must hold; a list matching nothing deletes nothing without a statement,
   * and a match naming no column is refused rather than emptying the table (claude-docs/db/write-path.md, "Writer contracts and filter fields").
   */
  delete<TTable extends PgTable & HardDeletable & Unscoped & Generic>(
    table: TTable,
    match: ColumnMatch<TTable>,
  ): Promise<TTable['$inferSelect'][]>;
}

/**
 * What `delete` names its rows by: a value per column, a list the column is in, or `null` for a nullable column that must be null.
 * Values rather than an `SQL` predicate, since a service may not build one. The stamps are not columns to match on.
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
  /** `all` (the default) needs every id in `categoryIds`; `any` needs at least one. */
  categoryMode?: CategoryMode;
  /**
   * Any of these forms, not every one: an entry matches when one of its live variants has a form in the list, both sides trimmed and lower-cased.
   * Blank entries are skipped, and an empty list is no filter.
   */
  forms?: readonly string[];
  /**
   * The curated form one of an entry's live variants picked, by its `form_id`: how a form's delete finds the entries holding it.
   * A uuid; the caller checks one first.
   */
  formId?: string;
  /**
   * Any of these celestial bodies: an entry matches when its `celestialBodies` list holds one, compared under the suggestions' fold;
   * how a body's delete and rename find the entries holding it, with a one-item list. Blank entries are skipped, an empty list is no filter.
   */
  celestialBodies?: readonly string[];
  /** Any of these signs, read from the entry's `zodiacSigns` as `celestialBodies` reads its list. */
  zodiacSigns?: readonly string[];
  /**
   * Any of these elements: an entry matches when its own `elements` list, or a live variant's, holds one of them.
   * A soft-deleted variant's list counts for nothing. An empty list is no filter.
   */
  elements?: readonly IngredientElement[];
  /**
   * Any of these curated deities: an entry matches when it holds a live link to one, by `ingredient_deities.deity_id`; how a deity's delete finds
   * the entries holding it, with a one-item list. Uuids; the caller checks them first. An empty list is no filter.
   */
  deityIds?: readonly string[];
  /**
   * `toxic`: the entry's own flag is on, or a live variant's is. `not_toxic`: neither is. A soft-deleted variant's flag counts for nothing.
   * Absent means any.
   */
  toxic?: 'toxic' | 'not_toxic';
  /**
   * A coven's list only: `local` keeps the coven's own entries, `compendium` the compendium entries it holds; absent keeps both.
   * The compendium's own read ignores it.
   */
  source?: 'local' | 'compendium';
  /**
   * A coven's list only: keep an entry when any live jar of the coven's is not at 0 (a jar with no quantity counts as held).
   * The compendium's own read ignores it.
   */
  inStock?: boolean;
  /**
   * A coven's list only: keep an entry when any live jar is badged Out of Stock (at 0) or Low Stock (above 0, at or below a threshold above 0);
   * a jar with no quantity never is. The compendium's own read ignores it.
   */
  lowStockOnly?: boolean;
  /** Only entries citing no live compendium reference: the admin's to-do list. */
  withoutReferences?: boolean;
  /** Only entries with no live form: the admin's other to-do list, entries nobody can stock yet. */
  withoutForms?: boolean;
  /** Only entries declaring this nomenclature. */
  nomenclature?: NomenclatureKind;
  /**
   * The compendium's only: true keeps the entries a curator has marked reviewed, false the ones still needing review; absent keeps both.
   * The service lets only a curator set it.
   */
  reviewed?: boolean;
  /**
   * The compendium only: keep an entry when a live cupboard row of any one of these covens names it. A proof each, so a coven the caller is not in
   * cannot be named; an empty list is no filter.
   */
  heldIn?: readonly Membership[];
  /**
   * The compendium only: keep an entry when no live cupboard row of any of these covens names it.
   * A proof each, as `heldIn`; an empty list is no filter.
   */
  notHeldIn?: readonly Membership[];
}

/** One facet value and how many entries the list would hold with it chosen. */
export interface FacetCount<TValue extends string = string> {
  value: TValue;
  count: number;
}

/**
 * How many entries each value of each filter kind would list, under the rest of the filter. Forms are spelled as shown, deities and categories
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
 * A coven's facets: the seven kinds, and the two settings only a coven's list has. `source` lists both values, zeros kept, in the enum's order;
 * `inStock` and `lowStockOnly` count the entries the list would hold with the switch on. Each is counted with its own setting left out.
 */
export interface WorkspaceIngredientFacets extends IngredientFacets {
  source: FacetCount<'local' | 'compendium'>[];
  inStock: number;
  lowStockOnly: number;
}

/**
 * The compendium's facets, and how many entries cite no live reference under the rest of the filter (the No Refs switch's count, the same on or off);
 * `withoutForms` is the same for entries with no live form. A coven's list has neither switch.
 */
export interface CompendiumFacets extends IngredientFacets {
  withoutReferences: number;
  withoutForms: number;
  /**
   * How many entries are reviewed and how many need review, under the rest of the filter. The repository always counts them;
   * the service answers null to anyone but a curator, since the mark is the curators' alone.
   */
  reviewed: FacetCount<ReviewFacetValue>[] | null;
}

/** The Reviewed filter's two settings, as its facet counts them. */
export type ReviewFacetValue = 'reviewed' | 'needs_review';

/**
 * What a compendium entry carries onto its edge: on a search, its rank (the best of its matched fields' word similarity to the query, each times that
 * field's weight, `searchMatch`), and null on a browse. The position that orders equal ranks is the key's alone, never carried.
 */
export interface CompendiumScore {
  score: number | null;
}

/** Which of the substitute picker's two groups an entry is listed in. */
export type SuggestionGroup = 'yours' | 'compendium';

/** What each row of the substitute picker carries beside its entry. */
export interface SuggestionGroupTag {
  group: SuggestionGroup;
}

/**
 * What an entry of a coven's ingredient list carries beside its rank: the coven's live cupboard row for it, read by the list's own join so
 * `Ingredient.cupboardEntry` needs no second read. Null for the coven's own entries.
 */
export interface WorkspaceListEdge extends CompendiumScore {
  cupboardEntry: CupboardEntryRow | null;
}

/**
 * The columns a list filters, sorts and counts that a coven's cupboard row may restate: each the row's value where it holds one, else the entry's.
 * On the compendium's own list they are the entry's columns, and there is no join.
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
 * An ingredient's identity as a write gives it: the two parts its `identity_key` is built from, the formal name and the label it falls back to.
 * Never the form, which is a variant's.
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
 * Where a vocabulary's in-use values are written: a `list` of `ingredients` whose entries are each one, or a `child` table's live rows,
 * each holding one in its `value` column (a deity link's `name`, a variant's `form`).
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
  /** The curated row's, which a pick sends; a value in use outside the vocabulary has none. */
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
  /** The curated row's, which a pick sends; a value in use outside the vocabulary has none. */
  id: string | null;
  /** The curated row's tradition, which tells two same-named deities apart; none in use. */
  tradition: string | null;
  /**
   * The other name the query matched, which the deity's own name does not show; none when its name matched, or it was found another way.
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
 * An `ingredients` row, compendium entry or coven's, as a finder returns it: without the name of the curator who reviewed it, which no finder
 * reads with the row (`unread-columns.ts`). The review date is on the row.
 */
export type IngredientRow = Omit<typeof ingredients.$inferSelect, UnreadIngredientColumn>;

/**
 * A row as the generic finders read it: the table's whole row, less any column `unread-columns.ts` keeps out of reads.
 * Writers' `returning()` still hold the whole row.
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

/** A `workspace_compendium_entries` row, a compendium entry's presence in one coven's cupboard, as a finder or a write returns it. */
export type CupboardEntryRow = typeof workspaceCompendiumEntries.$inferSelect;

/** A form of an ingredient, as a finder or a write returns it. */
export type VariantRow = typeof ingredientVariants.$inferSelect;

/** One `spell_steps` row, a step of a spell, as the writer reads it. */
export type SpellStepRow = typeof spellSteps.$inferSelect;
export type SpellRow = typeof spells.$inferSelect;
export type WorkingRow = typeof spellWorkings.$inferSelect;
export type WorkingParticipantRow = typeof spellWorkingParticipants.$inferSelect;
export type WorkingDeductionRow = typeof spellWorkingDeductions.$inferSelect;
/** How many workings a spell has. */
export interface WorkingCount {
  spellId: string;
  count: number;
}
/** One participant as a write names them: a coven member, or a typed name. */
export interface WorkingParticipantValue {
  userId?: string;
  name?: string;
}

/** A redirect from a slug an entry moved off: the entry, at its current slug, and when it ends. */
export interface SlugRedirect {
  entry: IngredientRow;
  expiresAt: Date;
}

/** An `invitations` row, either tier, as a finder or a write returns it. */
export type InvitationRow = typeof invitations.$inferSelect;

/** An `address` invitation, either tier: `invitations_kind_shape` gives it the address a card lacks. */
export type AddressInvitationRow = InvitationRow & { email: string };

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

/** A site role an invitation may grant: `curator` or `admin`, as the CHECK has it. */
export type InvitableSiteRole = Exclude<NonNullable<InvitationRow['siteRole']>, 'user'>;

/**
 * A site-tier invitation, which grants the site role it names: the workspace and the coven role both null, as the `invitations_tier` CHECK makes them
 * together, and the site role set, as `invitations_site_role_tier` makes it.
 */
export type SiteInvitationRow = AddressInvitationRow & {
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

/** What a batch of cards starts with: a token each, never stored, and the batch and expiry they share. */
export interface CardInvitationValues {
  tokens: string[];
  batchId: string;
  expiresAt: Date;
}

/** A card in any state: always in a batch. */
/** One batch of cards counted: all of them, the accepted ones, and those still pending. */
export type CardBatchTotal = { batchId: string; cards: number; accepted: number; pending: number };

export type CardRow = InvitationRow & { kind: 'card'; batchId: string };

/** A card some account accepted: who, when, and the batch it came from. */
export type CardArrivalRow = InvitationRow & {
  kind: 'card';
  acceptedAt: Date;
  acceptedBy: string;
  batchId: string;
};

/** What a workspace invitation starts with: the same, and the coven role it grants. */
export type WorkspaceInvitationValues = InvitationValues & { role: InvitableRole };

/** What the admin invitation list is narrowed by. Each part is optional, and absent means no filter. */
export interface SiteInvitationFilter {
  /** A substring of the invited address, case-insensitive, its `%` and `_` read literally. */
  email?: string;
  /** Only the invitations that lapse within this many hours of the database's `now()`. */
  expiresWithinHours?: number;
}

/** How a page of the grimoire is ordered and narrowed. */
export interface GrimoireQuery {
  order: (typeof GRIMOIRE_ORDERS)[number];
  /** Only the spells of this status; absent means both. */
  status?: (typeof spells.$inferSelect)['status'];
  /**
   * Only the spells whose title or intent holds this text as a word or part of one, accents and case set aside; absent or blank means no search.
   * It narrows the list and ranks it best match first, the asked-for order breaking a tie.
   */
  query?: string;
  /** Only the spells assigned these categories, by id; absent or empty means no filter. */
  categoryIds?: readonly string[];
  /** Whether a spell needs every chosen category ('all', the default) or any of them. */
  categoryMode?: CategoryMode;
  /**
   * Only the spells whose moon phase is any of these, trimmed and ignoring case; absent or empty means no filter.
   * Free text: the column has no vocabulary.
   */
  moonPhases?: readonly string[];
  /** As `moonPhases`, for the day of the week. */
  daysOfWeek?: readonly string[];
  /** Only the spells with any of these visibilities; absent or empty means no filter. */
  visibilities?: readonly (typeof spells.$inferSelect)['visibility'][];
  /**
   * Only the spells made (`created_by`, never the last editor) by any of
   * these users, by id; absent or empty means no filter. An id that made no
   * readable spell here lists nothing.
   */
  makerIds?: readonly string[];
}

/** The four facets the grimoire adds to Categories, each a list of values with their counts. */
export interface GrimoireFacetCounts {
  /** Each moon phase written on a readable spell, as the most-used spelling of it. */
  moonPhases: FacetCount[];
  /** As `moonPhases`, for the day of the week. */
  daysOfWeek: FacetCount[];
  /** Each visibility a readable spell holds. */
  visibilities: FacetCount<'private' | 'workspace'>[];
  /** Each user who made a readable spell, by user id. */
  makers: FacetCount[];
}

/** What the admin user list is narrowed by. Each part is optional, and absent means no filter. */
export interface UserFilter {
  /** A substring of the name or the email, case-insensitive, its `%` and `_` read literally. */
  query?: string;
  /** Only the users who may not yet create a workspace: the admin's to-do list. */
  awaitingApproval?: boolean;
  /** Only the users holding this site role. */
  role?: (typeof users.$inferSelect)['role'];
}

/** What the privilege ledger is narrowed by. Each part is optional, and absent means no filter. */
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

/** What the admin category list is narrowed by. Each part is optional, and absent means no filter. */
export interface CategoryFilter {
  /** A substring of the name, case-insensitive, its `%` and `_` read literally. */
  query?: string;
  /** Only the categories filed under this group. */
  groupId?: string;
}

/** An ingredient list a curated astrology vocabulary's values are written to, by its property name. */
export type AstrologyList = 'celestialBodies' | 'zodiacSigns';

/** One of the two astrology vocabularies, flat and alike. */
export type AstrologyVocabulary = FlatTable;

/** What an admin astrology list is narrowed by: a name fragment, as the forms' list is. */
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
 * What the admin deity list is narrowed by, as `IngredientFormValueFilter` narrows the forms.
 * Each part is optional, and absent means no filter.
 */
export interface DeityFilter {
  /** A substring of the name, case-insensitive, its `%` and `_` read literally. */
  query?: string;
  /** Only the deities filed under this tradition. */
  traditionId?: string;
}

/**
 * What an admin group list is narrowed by: the deity traditions
 * today, and the category and form groups if their pages take the search too.
 * Absent means no filter.
 */
export interface GroupFilter {
  /** A substring of the name, case-insensitive, its `%` and `_` read literally. */
  query?: string;
}

/** A user's display name, without the rest of the row: what a co-member may read. */
export interface UserName {
  id: string;
  name: string;
}

/** One provider account linked to a user, without the tokens its row holds. */
export interface LinkedProvider {
  userId: string;
  providerId: string;
}

/** One live compendium entry's address, as the sitemap and `llms.txt` list it. */
export interface CompendiumSlugEntry {
  slug: string;
  name: string;
  canonicalName: string | null;
  /** The entry's own description, for `llms.txt` notes; the sitemap ignores it. */
  description: string | null;
  /** When the entry last really changed: its `updated_at`. */
  lastModified: Date;
}
