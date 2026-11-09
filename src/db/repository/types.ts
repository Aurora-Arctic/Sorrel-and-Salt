import type { ExtractTablesWithRelations, SQL, SQLWrapper } from 'drizzle-orm';
import type { AnyPgColumn, PgTable, PgTransaction } from 'drizzle-orm/pg-core';
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js';
import type { supportReplies } from '../../modules/support/schema/support-replies';
import type { supportRequests } from '../../modules/support/schema/support-requests';
import type { invitations } from '../../modules/coven/schema/invitations';
import type { workspaceSlugs } from '../../modules/coven/schema/workspace-slugs';
import type { workspaceMembers, workspaces } from '../../modules/coven/schema/workspaces';
import type { adminRoleChangePauses } from '../../modules/identity/schema/admin-role-change-pauses';
import type { documentMailingRecipients } from '../../modules/documents/schema/document-mailing-recipients';
import type { documentMailings } from '../../modules/documents/schema/document-mailings';
import type { documentVersions } from '../../modules/documents/schema/document-versions';
import type { documents } from '../../modules/documents/schema/documents';
import type { userAccessPauses } from '../../modules/identity/schema/user-access-pauses';
import type { workspaceMemberPauses } from '../../modules/coven/schema/workspace-member-pauses';
import type { userPrivilegeChanges } from '../../modules/identity/schema/user-privilege-changes';
import type { auditColumns, users } from '../../modules/identity/schema/users';
import type { ingredientDeities } from '../../modules/ingredients/schema/ingredient-deities';
import type { ingredientVariants } from '../../modules/ingredients/schema/ingredient-variants';
import type {
  CategoryMode,
  CompendiumOrder,
  CompendiumSort,
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
import type { SupportSenderGroup, SupportView } from '../../lib/support-path';
import type { Cursor, PageRequest } from '../../lib/types';
import type { AuditSession, Generic } from '../types';
import type { FlatTable, ItemTable, PickedTable } from '../vocabularies';
import type { FormGroupIcon } from '../../modules/vocabulary/schema/form-group-icons';

export type AuditColumnName = keyof typeof auditColumns;

// A table admits the methods its own columns allow: `{ deletedAt?: never }` is
// satisfied only by a table without the column.
export type SoftDeletable = { deletedAt: AnyPgColumn };
export type HardDeletable = { deletedAt?: never };

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

export type Identified = { id: AnyPgColumn };

export type Revisioned = { revision: AnyPgColumn };

export type Slugged = { slug: AnyPgColumn };

export type Writable<TTable extends PgTable> = Omit<TTable['$inferInsert'], AuditColumnName>;

export type WritableInWorkspace<TTable extends PgTable> = Omit<Writable<TTable>, 'workspaceId'>;

/**
 * A sort column a page can be keyed on. NOT NULL, because a NULL key makes
 * a page bound's row comparison NULL and the row falls out of every page.
 */
export type SortColumn = AnyPgColumn<{ notNull: true }>;

/** An expression that can be NULL is the caller's bug (see `SortColumn`); one descending part among ascending ones is written negated. */
export type SortPart = SortColumn | { expression: SQL; type: string };

export interface KeyOrder {
  sort: readonly SortPart[];
  id: AnyPgColumn;
  /** The whole key, `(...sort, id)`, read in reverse: the exact reverse of the ascending list, ties included. */
  descending?: boolean;
  join?: { source: SQL; on: SQL };
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

export interface Keyset<Carried extends object = {}> extends KeyOrder {
  request: PageRequest;
  /** Each is read as the driver returns it: a `mapWith` on one is dropped. */
  carry?: { [K in keyof Carried]: SQL<Carried[K]> };
}

export type ListOrder<Carried extends object = {}> = Omit<Keyset<Carried>, 'id' | 'request'>;

export type PageOrder<Carried extends object = {}> = readonly SortPart[] | ListOrder<Carried>;

export interface KeysetCount {
  count: KeyOrder;
  /** A page's first row. None on an empty page, whose `countBefore` is null. */
  start: Cursor | undefined;
}

export interface SearchField {
  id: AnyPgColumn;
  text: AnyPgColumn;
  weight: number;
  from: SQLWrapper;
  live?: SQL;
}

export interface WeightedSearch {
  join: { source: SQL; on: SQL };
  score: SQL<number>;
  position: SQL<number>;
}

export interface WordMatch {
  matches: (text: AnyPgColumn) => SQL;
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
 * Never `similarity(a, b) > n` in the `where`: no trigram index answers
 * a function call (claude-docs/db/fuzzy-matching.md, "Fuzzy matching: one index, and a rule every caller is bound by").
 */
export interface Similarity {
  orderBy: SQL[];
  limit: number;
}

/** Each value is read as the driver returns it, so a count is cast in SQL rather than mapped. */
export interface Aggregate<TRow extends Record<string, unknown>> {
  aggregate: { [K in keyof TRow]: SQL<TRow[K]> };
  over: Pick<KeyOrder, 'join' | 'leftJoined' | 'wordMatch'>;
  /** A right join keeps every row of its table whatever `on` says, so that table's own filter goes in the `where`. */
  joins?: readonly AggregateJoin[];
  groupBy?: readonly (SQL | AnyPgColumn)[];
  orderBy?: readonly (SQL | AnyPgColumn)[];
  limit?: number;
}

export interface AggregateJoin {
  type: 'inner' | 'left' | 'right';
  table: PgTable;
  on: SQL | undefined;
}

/** The joined row takes no filter of its own; alias it when a correlated `where` reads the table too. */
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

export interface JoinedRow<TRow, TJoined> {
  row: TRow;
  joined: TJoined | null;
}

export interface Derived<TRow extends Record<string, unknown>> {
  source: SQL;
  fields: { [K in keyof TRow]: SQL<TRow[K]> };
}

/** Spelled from Drizzle's types, not `typeof db`: the client is importable only where its exemption is pinned. */
export type WriterTransaction = PgTransaction<
  PostgresJsQueryResultHKT,
  Record<string, never>,
  ExtractTablesWithRelations<Record<string, never>>
>;

export interface WriterContext {
  tx: WriterTransaction;
  session: AuditSession;
  insert(table: PgTable, values: object): Promise<never>;
  update(table: PgTable, values: object, where: SQL | undefined): Promise<never>;
  softDelete(table: PgTable, where: SQL | undefined): Promise<never>;
  /** `update` for a table carrying `revision`, with `updateRevisioned`'s contract over `where` alone: no scope, a stale row throws `StaleWrite`. */
  updateAtRevision(
    table: PgTable & Identified & Revisioned,
    where: SQL | undefined,
    expectedRevision: number | null,
    values: object,
  ): Promise<never>;
}

export interface AuditWriter {
  insert<TTable extends PgTable & Unscoped & Generic>(
    table: TTable,
    values: Writable<TTable>,
  ): Promise<TTable['$inferSelect'][]>;
  insertInWorkspace<TTable extends PgTable & WorkspaceScoped & Generic>(
    membership: Membership,
    table: TTable,
    values: WritableInWorkspace<TTable>,
  ): Promise<TTable['$inferSelect'][]>;
  /** A soft-deleted row never matches, here or in any update below. */
  update<TTable extends PgTable & Unscoped & Generic>(
    table: TTable,
    values: Partial<Writable<TTable>>,
    where: SQL,
  ): Promise<TTable['$inferSelect'][]>;
  /** Names the row by id: a service may not import `drizzle-orm` at runtime to build the `where`. */
  updateById<TTable extends PgTable & Unscoped & Generic & Identified>(
    table: TTable,
    id: string,
    values: Partial<Writable<TTable>>,
  ): Promise<TTable['$inferSelect'][]>;
  updateInWorkspace<TTable extends PgTable & WorkspaceScoped & Generic>(
    membership: Membership,
    table: TTable,
    values: Partial<WritableInWorkspace<TTable>>,
    where: SQL,
  ): Promise<TTable['$inferSelect'][]>;
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
  /** A row already deleted never matches, here or below, so it keeps the stamps of whoever deleted it. */
  softDelete<TTable extends PgTable & SoftDeletable & Unscoped & Generic>(
    table: TTable,
    where: SQL,
  ): Promise<TTable['$inferSelect'][]>;
  softDeleteInWorkspace<TTable extends PgTable & SoftDeletable & WorkspaceScoped & Generic>(
    membership: Membership,
    table: TTable,
    where: SQL,
  ): Promise<TTable['$inferSelect'][]>;
  softDeleteByIdInWorkspace<
    TTable extends PgTable & SoftDeletable & WorkspaceScoped & Generic & Identified,
  >(
    membership: Membership,
    table: TTable,
    id: string,
  ): Promise<TTable['$inferSelect'][]>;
  softDeleteByIds<TTable extends PgTable & SoftDeletable & Unscoped & Generic & Identified>(
    table: TTable,
    ids: readonly string[],
  ): Promise<TTable['$inferSelect'][]>;
  insertInCompendium<TTable extends PgTable & TwoTier & Generic>(
    curator: Curator,
    table: TTable,
    values: WritableInWorkspace<TTable>,
  ): Promise<TTable['$inferSelect'][]>;
  /** A workspace's row, or a soft-deleted one, is not reached: nothing is written and nothing returned. */
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
  /** The only writer of the column; a real change to the row, so its audit stamps move. */
  setShownInCompendium(curator: Curator, id: string, shown: boolean): Promise<IngredientRow[]>;
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
  touchByIdInWorkspace<TTable extends PgTable & WorkspaceScoped & Generic & Identified>(
    membership: Membership,
    table: TTable,
    id: string,
  ): Promise<TTable['$inferSelect'][]>;
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
   * Open a pause on keeper role changes, stamped from the session. No row comes back while one is open:
   * the one-open index refuses a second, and the call writes nothing rather than failing the transaction.
   */
  pauseAdminRoleChanges(admin: SiteAdmin): Promise<(typeof adminRoleChangePauses.$inferSelect)[]>;
  /**
   * End the open pause, stamping `ended_at` now and `ended_by` from the
   * session. No row comes back when none is open.
   */
  resumeAdminRoleChanges(admin: SiteAdmin): Promise<(typeof adminRoleChangePauses.$inferSelect)[]>;
  /**
   * The live keepers, locked `for update` until the transaction ends: what a revoke counts before it writes, so two keepers revoking each other
   * at once cannot both leave the other the last. A read, in the writer because the lock must be taken in the writing transaction.
   */
  lockLiveAdmins(admin: SiteAdmin): Promise<(typeof users.$inferSelect)[]>;
  /** Write a document's title and lede, stamped from the session. No row comes back for a soft-deleted or missing document. */
  updateDocument(
    admin: SiteAdmin,
    documentId: string,
    values: DocumentTextInput,
  ): Promise<DocumentRow[]>;
  /**
   * Open the document's draft: the next number past every version it ever held, deleted ones included, with `body` when one is given, else
   * the body of the latest live published version, or empty when it has none. A given body is written in the insert, so the draft
   * starts at revision 1. No row comes back while a draft is open, or for a soft-deleted or missing document.
   */
  openDocumentDraft(
    admin: SiteAdmin,
    documentId: string,
    body?: string,
  ): Promise<DocumentVersionRow[]>;
  /**
   * Write a draft's body while it is at `expectedRevision`: a draft that has moved on throws `StaleWrite` with its revision now, and
   * `null` writes whatever the draft holds. A published, deleted or missing version answers `[]`, never `StaleWrite`.
   */
  saveDocumentDraft(
    admin: SiteAdmin,
    versionId: string,
    expectedRevision: number | null,
    body: string,
  ): Promise<DocumentVersionRow[]>;
  /** Publish a draft, dated now, under `saveDocumentDraft`'s revision contract. An already published version answers `[]`. */
  publishDocumentDraft(
    admin: SiteAdmin,
    versionId: string,
    expectedRevision: number | null,
  ): Promise<DocumentVersionRow[]>;
  /**
   * Soft-delete a draft while it is at `expectedRevision`: a draft that has moved on throws `StaleWrite` with its revision now. A
   * published, deleted or missing version answers `[]`, never `StaleWrite`.
   */
  discardDocumentDraft(
    admin: SiteAdmin,
    versionId: string,
    expectedRevision: number,
  ): Promise<DocumentVersionRow[]>;
  /**
   * Start one mailing of published versions, sending, with an item for each. No row comes back, and nothing is written, when any
   * version is a draft, soft-deleted or missing.
   */
  startDocumentMailing(
    admin: SiteAdmin,
    mailing: DocumentMailingInput,
  ): Promise<DocumentMailingRow[]>;
  /** Wait for any other transaction starting a mailing, then hold the start until this one ends, so two keepers start one mailing. */
  lockDocumentMailingStart(admin: SiteAdmin): Promise<void>;
  /** Add accounts to a mailing, unsent. An account already in it is skipped, so the rows added come back; none for an empty list. */
  addDocumentMailingRecipients(
    mailingId: string,
    userIds: readonly string[],
  ): Promise<DocumentMailingRecipientRow[]>;
  /** Stamp the named accounts of a mailing sent now. One already sent is left as it is, so the first send time stands. */
  markDocumentMailingRecipientsSent(
    mailingId: string,
    userIds: readonly string[],
  ): Promise<DocumentMailingRecipientRow[]>;
  /** Give up on one account of a mailing, which can never be mailed: stamped skipped now, never sent. One already sent or skipped is left as it is. */
  skipDocumentMailingRecipient(
    mailingId: string,
    userId: string,
  ): Promise<DocumentMailingRecipientRow[]>;
  /** Wait for any other transaction holding the mailing's turn, then hold it until this one ends, so batch steps of one mailing take turns. */
  lockDocumentMailingTurn(mailingId: string): Promise<void>;
  /** Mark a sending mailing replaced, once every version it covers or their documents are gone. A mailing in any other state answers `[]`. */
  replaceDocumentMailing(mailingId: string): Promise<DocumentMailingRow[]>;
  /** Finish a sending mailing: sent, dated now. A mailing that is sent or replaced answers `[]`. */
  finishDocumentMailing(mailingId: string): Promise<DocumentMailingRow[]>;
  /** Mark every live sending and paused mailing replaced; each keeps what it sent. */
  replaceOpenDocumentMailings(admin: SiteAdmin): Promise<DocumentMailingRow[]>;
  /** Pause a sending mailing, for the provider's monthly quota. A mailing in any other state answers `[]`. */
  pauseDocumentMailing(mailingId: string): Promise<DocumentMailingRow[]>;
  /** Set a paused mailing sending again. A mailing in any other state answers `[]`. */
  resumeDocumentMailing(admin: SiteAdmin, mailingId: string): Promise<DocumentMailingRow[]>;
  /**
   * Pause a user's access, stamped from the session: `until` null for no end date. The user's live pause, standing or run out, is
   * lifted first from the session, so the one-live index takes the new row. No row comes back when a pause set alongside took the slot.
   */
  setUserAccessPause(
    admin: SiteAdmin,
    userId: string,
    pause: UserAccessPauseInput,
  ): Promise<UserAccessPauseRow[]>;
  /**
   * Lift the pause standing on a user's access, stamping `lifted_at` now and `lifted_by` from the session. No row comes back when
   * none stands; a pause that has run out is left as it is.
   */
  liftUserAccessPause(admin: SiteAdmin, userId: string): Promise<UserAccessPauseRow[]>;
  /**
   * Pause a member's access to the proof's coven, stamped from the session: `until` null for no end date. The member's live pause
   * there, standing or run out, is lifted first from the session, so the one-live index takes the new row. No row comes back when a
   * pause set alongside took the slot. The permission the proof must carry is the service's to check.
   */
  setWorkspaceMemberPause(
    membership: Membership,
    userId: string,
    pause: WorkspaceMemberPauseInput,
  ): Promise<WorkspaceMemberPauseRow[]>;
  /**
   * Lift the pause standing on a member's access to the proof's coven, stamping `lifted_at` now and `lifted_by` from the session.
   * No row comes back when none stands there; a pause that has run out is left as it is.
   */
  liftWorkspaceMemberPause(
    membership: Membership,
    userId: string,
  ): Promise<WorkspaceMemberPauseRow[]>;
  /**
   * Soft-delete the proof's own workspace, stamped from the session; the `workspaces` row is the proof's `workspaceId` (it has no `workspace_id` column).
   * Membership rows are untouched. An empty result means the workspace was already deleted.
   */
  softDeleteWorkspace(membership: Membership): Promise<(typeof workspaces.$inferSelect)[]>;
  /**
   * Record an address for a coven named by id, stamped from the session: the writer for a coven being made, whose proof does not exist
   * yet. The unique index refuses an address another live coven holds.
   */
  insertWorkspaceSlug(workspaceId: string, slug: string): Promise<WorkspaceSlugRow[]>;
  /**
   * Set the proof's coven's name and address, and record the previous and the new address in `workspace_slugs` unless the coven already
   * holds a live row for one. An empty result means the coven is deleted. The caller has checked `workspace: update`.
   */
  updateWorkspaceName(
    membership: Membership,
    values: { name: string; slug: string },
  ): Promise<(typeof workspaces.$inferSelect)[]>;
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
   * or removal writes, so two stewards stepping down at once cannot both leave the other the last. A read, in the writer for the lock's sake.
   */
  lockLiveMembers(membership: Membership): Promise<(typeof workspaceMembers.$inferSelect)[]>;
  /**
   * Takes the proof's coven's stock lock until the transaction ends: a jar-adding create, a cupboard remove that counts jars, and the two conversions
   * that move them queue on it, so none misses another's write. Taken first, before any read or write; another coven's call is not held up.
   */
  lockCovenStock(membership: Membership): Promise<void>;
  /**
   * Takes the account's support-send lock until the transaction ends, then reads what a send decides on: the account's requests
   * in the last `windowSeconds` and the end of the time-out standing on it. Taken first, so two sends from one account queue and the
   * second counts the first; another account's send is not held up.
   */
  lockSupportSender(
    userId: string,
    windowSeconds: number,
  ): Promise<{ recent: number; timedOut: StandingTimeout | undefined }>;
  /**
   * Counts one signed-out send against the keys of an email address and of a client address (`src/lib/send-count-key.ts`, never
   * the addresses themselves), each in its own row of `support_send_counts`, and returns both counts for the window ending at `now`. A row whose window began more than `windowSeconds` before `now`
   * starts over at one. Takes a lock per key until the transaction ends, so sends racing each other all count.
   */
  countSignedOutSend(
    addressKey: string,
    clientKey: string,
    now: Date,
    windowSeconds: number,
  ): Promise<{ address: number; client: number }>;
  /** Counts one read of a mailed link against the client key alone, in its own row, and returns the count for the window ending at `now`. */
  countSignedOutView(clientKey: string, now: Date, windowSeconds: number): Promise<number>;
  /**
   * Moves a support request from one of `from` to `values.status` in a single guarded update, and returns the row, or none when
   * its status is no longer one of `from` (or, given `ownerId`, it is not that sender's): the guard is in the `where`, so two
   * moves racing cannot both win.
   */
  moveSupportRequest(
    id: string,
    ownerId: string | null,
    from: readonly SupportRequestStatus[],
    values: SupportRequestMove,
  ): Promise<(typeof supportRequests.$inferSelect)[]>;
  /**
   * Closes those of requests `ids` still resolved with `resolved_at` at or before `cutoff`, stamping `closed_at` as the
   * day its seven days ended; returns the rows closed.
   */
  closeIdleResolvedSupportRequests(
    cutoff: Date,
    ids: readonly string[],
  ): Promise<(typeof supportRequests.$inferSelect)[]>;
  /** Stamps the closing-soon notice on request `id` while it is still resolved and unstamped; none when it was not. */
  markClosingNoticeSent(id: string, sentAt: Date): Promise<(typeof supportRequests.$inferSelect)[]>;
  /** Clears account `userId`'s pending address while the row is still stamped `sentAt`, the change mailed then; none when a later change or the swap moved it. */
  lapseEmailChange(userId: string, sentAt: Date): Promise<(typeof users.$inferSelect)[]>;
  /** Clears account `userId`'s former address while it is still `formerEmail` and the row still at `email`, the move its notice named; none when either changed. */
  clearFormerEmail(
    userId: string,
    formerEmail: string,
    email: string,
  ): Promise<(typeof users.$inferSelect)[]>;
  /** Stamps the sender's notice of staff reply `id` while it is unstamped; none when it already was. */
  markReplyNoticeSent(id: string, sentAt: Date): Promise<(typeof supportReplies.$inferSelect)[]>;
  /**
   * Strips those of requests `ids` still closed with `closed_at` at or before `cutoff` of what each holds of its
   * sender: subject, message, path, address and sender id, and its replies' text. Topic, status, dates and the rows stay, so the
   * counts do. A request already stripped is left alone; returns the rows stripped.
   */
  anonymiseClosedSupportRequests(
    cutoff: Date,
    ids: readonly string[],
  ): Promise<(typeof supportRequests.$inferSelect)[]>;
  /** Stores `hash`, the SHA-256 of a mailed view link's token, on signed-out request `id`, replacing the one before, and when it stops working; none when the request has no address on it. */
  setSupportViewToken(
    id: string,
    hash: string,
    expiresAt: Date,
  ): Promise<(typeof supportRequests.$inferSelect)[]>;
  /**
   * Moves the stand-in's requests whose address is `email` (case aside), and their sender replies, to account `realId`, clearing their address and
   * view link; returns the requests moved. The standing address-only time-outs that bind `addressKey` (the address's count key) take `realId` as their account. The caller proves the address is the account's own and verified.
   */
  claimSupportRequestsByEmail(realId: string, email: string, addressKey: string): Promise<number>;
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
   * decrements stock, so a completed working's deduction joins the working's transaction and cannot race another. The jar is locked first,
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
   * Invite an address to the site role it names (curator or keeper), on the site tier, where the workspace and the coven role are both null.
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
   * Record one refused open of the card `invitationId` by the session's user for `reason`: a new row, or the live row's `attempts` plus one and a later `last_attempted_at`.
   * Under no proof, since the account is signed in and nothing here reads the card; the service has decided it is a recordable refusal.
   */
  recordCardAttempt(invitationId: string, reason: CardAttemptReason): Promise<CardAttemptRow[]>;
  /**
   * Accepts the pending invitation a token names, under no proof. No row comes back unless the user holds the
   * invited address, verified; a card admits any verified account once (claude-docs/db/invitations.md,
   * "Accepting from the account page").
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

/** Values rather than an `SQL` predicate, since a service may not build one; the stamps are not columns to match on. */
export type ColumnMatch<TTable extends PgTable> = {
  [K in keyof Writable<TTable>]?:
    | NonNullable<Writable<TTable>[K]>
    | readonly NonNullable<Writable<TTable>[K]>[]
    | (null extends Writable<TTable>[K] ? null : never);
};

export interface SimilarityScore {
  score: number;
}

export interface IngredientFilter {
  /** Word-similar (`<%`, at 0.5) to the label, the formal name or a live folk name, case- and accent-folded. */
  query?: string;
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
   * Any of these celestial bodies: an entry matches when its own `celestialBodies` list, or a live variant's, holds one, compared under the suggestions' fold;
   * how a body's delete and rename find the entries holding it, with a one-item list. A soft-deleted variant's list counts for nothing.
   * Blank entries are skipped, an empty list is no filter.
   */
  celestialBodies?: readonly string[];
  /** Any of these signs, read from the entry's and its live variants' `zodiacSigns` as `celestialBodies` reads its lists. */
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
  /** Only entries citing no live compendium reference: the keeper's to-do list. */
  withoutReferences?: boolean;
  /** Only entries with no live form: the keeper's other to-do list, entries nobody can stock yet. */
  withoutForms?: boolean;
  /** Only entries declaring this nomenclature. */
  nomenclature?: NomenclatureKind;
  /**
   * The compendium's only: true keeps the entries a curator has marked reviewed, false the ones still needing review; absent keeps both.
   * The service lets only a curator set it.
   */
  reviewed?: boolean;
  /**
   * The compendium's only: which entries by their shown flag. Absent or 'shown' keeps the shown ones, 'hidden' the hidden ones and 'all' both.
   * A coven's cupboard read ignores it and keeps a hidden entry it names. The service lets only a curator set anything but shown.
   */
  listing?: 'shown' | 'hidden' | 'all';
  /**
   * The column the list sorts on, overriding best match under a query: `name` A to Z, or the compendium's `sourcing_score`, lowest first, then name.
   * Absent orders by name, or by best match under a query. A coven's cupboard read ignores the sourcing score. The service lets only a curator set it.
   */
  sort?: CompendiumSort;
  /** `desc` reads `sort`'s whole key in reverse, name and id included; ignored without a `sort`. */
  order?: CompendiumOrder;
  /** The compendium's only: carry each entry's sourcing score as `sourcingScore`, read in the page's own query. The service lets only a curator set it. */
  withSourcingScore?: boolean;
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

export interface FacetCount<TValue extends string = string> {
  value: TValue;
  count: number;
}

/** Forms are spelled as shown, deities and categories are row ids, and the astrology kinds are the curated rows' names. */
export interface IngredientFacets {
  forms: FacetCount[];
  deities: FacetCount[];
  categories: FacetCount[];
  zodiacSigns: FacetCount[];
  celestialBodies: FacetCount[];
  elements: FacetCount<IngredientElement>[];
  toxic: FacetCount<'toxic' | 'not_toxic'>[];
}

/** `source` lists both values, zeros kept, in the enum's order; `inStock` and `lowStockOnly` count the entries the list would hold with the switch on, each with its own setting left out. */
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

export type ReviewFacetValue = 'reviewed' | 'needs_review';

/**
 * What a compendium entry carries onto its edge: on a search, its rank (the best of its matched fields' word similarity to the query, each times that
 * field's weight, `searchMatch`), and null on a browse. The position that orders equal ranks is the key's alone, never carried.
 */
export interface CompendiumScore {
  score: number | null;
}

export interface CompendiumListEdge extends CompendiumScore {
  sourcingScore?: number;
}

export type SuggestionGroup = 'yours' | 'compendium';

export interface SuggestionGroupTag {
  group: SuggestionGroup;
}

/** The coven's live cupboard row, read by the list's own join so `Ingredient.cupboardEntry` needs no second read. */
export interface WorkspaceListEdge extends CompendiumScore {
  cupboardEntry: CupboardEntryRow | null;
}

/** Each is the cupboard row's value where it holds one, else the entry's; the compendium's own list has no join. */
export interface ListColumns {
  name: SortPart;
  elements: SQLWrapper;
  celestialBodies: SQLWrapper;
  zodiacSigns: SQLWrapper;
  leftJoined?: LeftJoin<PgTable>;
}

/** Never the form, which is a variant's. */
export interface IngredientIdentity {
  name: string;
  canonicalName?: string | null;
}

export type ListedVocabulary = FlatTable | ItemTable;

export type SuggestingVocabulary = FlatTable | PickedTable;

export type InUseSource =
  | { list: AnyPgColumn }
  | { child: typeof ingredientDeities; value: typeof ingredientDeities.name }
  | { child: typeof ingredientVariants; value: typeof ingredientVariants.form };

export interface VocabularySuggestion {
  value: string;
  /** The curated row's; a value in use outside the vocabulary has none. */
  description: string | null;
  curated: boolean;
}

export interface FormSuggestion extends VocabularySuggestion {
  id: string | null;
  group: string | null;
  icon: FormGroupIcon | null;
  claimants: Claimant[];
}

export interface DeitySuggestion extends VocabularySuggestion {
  id: string | null;
  tradition: string | null;
  matchedName: string | null;
}

export interface Claimant {
  name: string;
  canonicalName: string | null;
}

export interface SuggestionRow {
  /** 0 a curated name match, 1 a curated description match, 2 in use outside the vocabulary. */
  tier: number;
  id: string | null;
  value: string;
  description: string | null;
  group: string | null;
  icon: FormGroupIcon | null;
  matchedName: string | null;
  fold: string;
  tiebreak: string;
  claimants: Claimant[];
}

export interface CommonNameSuggestion {
  value: string;
  claimants: Claimant[];
}

export type ReferenceRow = typeof references.$inferSelect;

export type ReferenceLinkRow = typeof referenceLinks.$inferSelect;

export interface CitingLink {
  link: ReferenceLinkRow;
  reference: ReferenceRow;
}

export type UnreadIngredientColumn = 'curatorReviewedBy';

/** Without the curator who reviewed it, which no finder reads with the row (`unread-columns.ts`). */
export type IngredientRow = Omit<typeof ingredients.$inferSelect, UnreadIngredientColumn>;

export type DocumentRow = typeof documents.$inferSelect;

export interface DocumentTextInput {
  title: string;
  lede: string;
}

export type DocumentVersionRow = typeof documentVersions.$inferSelect;

export type DocumentMailingRow = typeof documentMailings.$inferSelect;

export interface DocumentMailingInput {
  items: readonly { versionId: string; summary: string }[];
  recipientCount: number;
}

export interface PendingDocumentVersion {
  documentId: string;
  versionId: string;
  key: string;
  title: string;
  versionNumber: number;
}

export interface DocumentMailingItem {
  mailingId: string;
  versionId: string;
  key: string;
  title: string;
  versionNumber: number;
  summary: string;
}

export type DocumentMailingRecipientRow = typeof documentMailingRecipients.$inferSelect;

export type UserAccessPauseRow = typeof userAccessPauses.$inferSelect;

/** What a site access pause is set with: `until` null for no end date, and always a note saying why. */
export interface UserAccessPauseInput {
  until: Date | null;
  note: string;
  message?: string | null;
}

export type WorkspaceRow = typeof workspaces.$inferSelect;

export type WorkspaceSlugRow = typeof workspaceSlugs.$inferSelect;

export type WorkspaceMemberPauseRow = typeof workspaceMemberPauses.$inferSelect;

/** What a coven pause is set with: `until` null for no end date, and a note or none. */
export interface WorkspaceMemberPauseInput {
  until: Date | null;
  note: string | null;
  message?: string | null;
}

export type ReadRow<TTable extends PgTable> = TTable extends typeof ingredients
  ? IngredientRow
  : TTable['$inferSelect'];

export interface CompendiumReviewRow {
  /** `null` once the mark is cleared: the entry needs review. */
  reviewedAt: Date | null;
}

export type StockRow = typeof inventoryItems.$inferSelect;

export type CupboardEntryRow = typeof workspaceCompendiumEntries.$inferSelect;

export type VariantRow = typeof ingredientVariants.$inferSelect;

export type SpellStepRow = typeof spellSteps.$inferSelect;
export type SpellRow = typeof spells.$inferSelect;
export type WorkingRow = typeof spellWorkings.$inferSelect;
export type WorkingParticipantRow = typeof spellWorkingParticipants.$inferSelect;
export type WorkingDeductionRow = typeof spellWorkingDeductions.$inferSelect;
export interface WorkingCount {
  spellId: string;
  count: number;
}
export interface WorkingParticipantValue {
  userId?: string;
  name?: string;
}

export interface SlugRedirect {
  entry: IngredientRow;
  expiresAt: Date;
}

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

export interface ReceivedInvitationInviter {
  id: string;
  name: string;
}

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

export type InvitableRole = Exclude<NonNullable<InvitationRow['role']>, 'owner'>;

/** What an invitation on either tier starts with; the expiry defaults to seven days out. */
type InvitationValues = Pick<typeof invitations.$inferInsert, 'email' | 'expiresAt' | 'note'> & {
  /** The link's token, never stored: the writer stores its hash. */
  token: string;
};

export type SiteInvitationValues = InvitationValues & { siteRole: InvitableSiteRole };

export interface CardInvitationValues {
  tokens: string[];
  batchId: string;
  expiresAt: Date;
  note: string | null;
  beta: boolean;
}

/** A card's place in its batch, from 1; null for an older card. */
export type CardPosition = { id: string; position: number | null };

export type CardBatchTotal = {
  batchId: string;
  cards: number;
  accepted: number;
  pending: number;
  attempts: number;
};

export type CardBatchStatus = 'live' | 'revoked' | 'expired' | 'used-up';

export interface CardBatchFilter {
  /** The start of the batch number, or text anywhere in its note; case-insensitive. */
  batch?: string;
  status?: CardBatchStatus;
  /** Days as `YYYY-MM-DD` in UTC, both ends included. */
  mintedFrom?: string;
  mintedTo?: string;
  expiresFrom?: string;
  expiresTo?: string;
}

export interface CardArrivalFilter {
  query?: string;
}

export type CardRow = InvitationRow & { kind: 'card'; batchId: string };

export type CardAttemptReason = 'revoked' | 'expired' | 'accepted';

export type CardAttemptRow = {
  id: string;
  invitationId: string;
  userId: string;
  reason: CardAttemptReason;
  attempts: number;
  lastAttemptedAt: Date;
  createdAt: Date;
};

export type CardArrivalRow = InvitationRow & {
  kind: 'card';
  acceptedAt: Date;
  acceptedBy: string;
  batchId: string;
};

export type WorkspaceInvitationValues = InvitationValues & { role: InvitableRole };

export interface SiteInvitationFilter {
  /** A substring of the invited address, case-insensitive, its `%` and `_` read literally. */
  email?: string;
  /** Only the invitations that lapse within this many hours of the database's `now()`. */
  expiresWithinHours?: number;
}

export interface GrimoireQuery {
  order: (typeof GRIMOIRE_ORDERS)[number];
  status?: (typeof spells.$inferSelect)['status'];
  /**
   * Only the spells whose title or intent holds this text as a word or part of one, accents and case set aside; absent or blank means no search.
   * It narrows the list and ranks it best match first, the asked-for order breaking a tie.
   */
  query?: string;
  categoryIds?: readonly string[];
  categoryMode?: CategoryMode;
  /**
   * Only the spells whose moon phase is any of these, trimmed and ignoring case; absent or empty means no filter.
   * Free text: the column has no vocabulary.
   */
  moonPhases?: readonly string[];
  daysOfWeek?: readonly string[];
  visibilities?: readonly (typeof spells.$inferSelect)['visibility'][];
  /**
   * Only the spells made (`created_by`, never the last editor) by any of
   * these users, by id; absent or empty means no filter. An id that made no
   * readable spell here lists nothing.
   */
  makerIds?: readonly string[];
}

export interface GrimoireFacetCounts {
  /** Each moon phase written on a readable spell, as the most-used spelling of it. */
  moonPhases: FacetCount[];
  daysOfWeek: FacetCount[];
  visibilities: FacetCount<'private' | 'workspace'>[];
  makers: FacetCount[];
}

export interface UserFilter {
  /** A substring of the name or the email, case-insensitive, its `%` and `_` read literally. */
  query?: string;
  awaitingApproval?: boolean;
  role?: (typeof users.$inferSelect)['role'];
  /** Only the users a support time-out stands on: not lifted, and with no end date or one still ahead. */
  timedOut?: boolean;
  /** Only the users a site access pause stands on: not lifted, and with no end date or one still ahead. */
  paused?: boolean;
}

export interface PrivilegeChangeFilter {
  userId?: string;
  privilege?: (typeof userPrivilegeChanges.$inferSelect)['privilege'];
  /** A live user's name or email holds this, matched as `SiteInvitationFilter.email` is. */
  query?: string;
}

export interface CategoryFilter {
  /** A substring of the name, case-insensitive, its `%` and `_` read literally. */
  query?: string;
  /** Only the categories filed under this group. */
  groupId?: string;
}

export type AstrologyList = 'celestialBodies' | 'zodiacSigns';

export type AstrologyVocabulary = FlatTable;

export interface AstrologyValueFilter {
  /** A substring of the name, case-insensitive, its `%` and `_` read literally. */
  query?: string;
}

export interface IngredientFormValueFilter {
  /** A substring of the name, case-insensitive, its `%` and `_` read literally. */
  query?: string;
  groupId?: string;
}

export interface DeityFilter {
  /** A substring of the name, case-insensitive, its `%` and `_` read literally. */
  query?: string;
  traditionId?: string;
}

export interface GroupFilter {
  /** A substring of the name, case-insensitive, its `%` and `_` read literally. */
  query?: string;
}

export interface UserName {
  id: string;
  name: string;
}

/** One provider account linked to a user, without the tokens its row holds. */
export interface LinkedProvider {
  userId: string;
  providerId: string;
}

export interface CompendiumSlugEntry {
  slug: string;
  name: string;
  canonicalName: string | null;
  description: string | null;
  lastModified: Date;
}

export type SupportReader =
  { role: 'admin'; proof: SiteAdmin } | { role: 'curator'; proof: Curator };

export interface SupportViewer {
  userId: string;
  role: 'user' | 'curator' | 'admin';
}

export type SupportRequestStatus = 'open' | 'waiting_on_sender' | 'resolved' | 'closed';

export interface SupportRequestMove {
  status: SupportRequestStatus;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
  closedAt?: Date | null;
  closingNoticeSentAt?: null;
  lastSenderActivityAt?: Date;
  lastStaffActivityAt?: Date;
}

export interface SupportRequestFilter {
  about?: 'accessibility' | 'bug' | 'account' | 'compendium' | 'privacy' | 'feedback' | 'question';
  status?: 'open' | 'waiting_on_sender' | 'resolved' | 'closed';
  errorCode?: number;
  view?: SupportView;
  senderGroup?: SupportSenderGroup;
}

export type SupportViewCounts = Record<SupportView, number>;

export interface StandingTimeout {
  until: Date | null;
}

export interface SupportMenuCounts {
  assignedOpen: number;
  waitingOnMe: number;
}

export interface SupportStatusCounts {
  open: number;
  closed: number;
}
