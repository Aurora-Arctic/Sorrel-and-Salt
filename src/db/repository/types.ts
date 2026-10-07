import type { SQL } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';
import type { adminInvitations } from '../../modules/identity/schema/admin-invitations';
import type { adminRoleChangePauses } from '../../modules/identity/schema/admin-role-change-pauses';
import type { auditColumns } from '../../modules/identity/schema/users';
import type { ingredientDeities } from '../../modules/ingredients/schema/ingredient-deities';
import type { ingredients } from '../../modules/ingredients/schema/ingredients';
import type { referenceLinks } from '../../modules/ingredients/schema/reference-links';
import type { references } from '../../modules/ingredients/schema/references';
import type { retiredIngredientSlugs } from '../../modules/ingredients/schema/retired-ingredient-slugs';
import type { planets, zodiacSigns } from '../../modules/vocabulary/schema/astrology';
import type { deities } from '../../modules/vocabulary/schema/deities';
import type { ingredientForms } from '../../modules/vocabulary/schema/ingredient-forms';
import type { Membership } from '@/modules/coven';
import type { SiteAdmin } from '@/modules/identity';
import type { Cursor, PageRequest } from '../../lib/types';

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
// Only such a table takes the compendium-tier writes, under a `SiteAdmin`.
export type TwoTier = { workspaceId: AnyPgColumn<{ notNull: false }> };

// And once more for visibility (M10.3), so that a table goes through exactly
// one finder — claude-docs/db/spell-visibility.md, "Spell visibility". `spells` is
// workspace-scoped *and* carries a per-row reader rule, so `NotVisibilityScoped`
// takes it off the generic scoped finders and `findManySpells`/`findOneSpell`
// name it directly; the two join tables carry a `spell_id` and no workspace of
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

// And for the admin ledger (MB.58): `admin_role_changes` is append-only by
// the repository rather than by grant, since `sorrel` owns its tables and a
// REVOKE would not bind it. Its `change` column marks it, as `visibility`
// marks `spells`, and `NotAppendOnly` takes it off every update and delete
// below, leaving it the insert and the finders.
export type NotAppendOnly = { change?: never };

// And for the pause ledger (MB.62): `admin_role_change_pauses` is opened and
// ended by the writer's two named calls alone, so a pause cannot be inserted
// already ended, reopened or deleted, and its ended pair comes from the
// session. Its `ended_at` column marks it, and `NotPauseLedger` takes it off
// the generic insert, every update and every delete below.
export type NotPauseLedger = { endedAt?: never };

// And for the admin invitation (MB.69): `admin_invitations` is what will
// authorise a grant, so a row is made only by the writer's named insert under
// the `SiteAdmin` proof, and is stamped accepted or revoked only by its two
// named writes. Its `token_hash` marks it; `workspace_invitations` carries
// one too, and is already off every method below as `WorkspaceScoped`.
export type NotInvitation = { tokenHash?: never };

/** A table with a surrogate key, which is every one but the two hard-deleted join tables. */
export type Identified = { id: AnyPgColumn };

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

/** What `withAudit` hands its callback: every write, stamped from the session. */
export interface AuditWriter {
  /** Insert one row, stamping created_* and updated_* from the session. */
  insert<TTable extends PgTable & Unscoped & NotPauseLedger & NotInvitation>(
    table: TTable,
    values: Writable<TTable>,
  ): Promise<TTable['$inferSelect'][]>;
  /** Insert one row into the workspace the proof names, filling `workspace_id` from it. */
  insertInWorkspace<TTable extends PgTable & WorkspaceScoped>(
    membership: Membership,
    table: TTable,
    values: WritableInWorkspace<TTable>,
  ): Promise<TTable['$inferSelect'][]>;
  /**
   * Update matching rows, stamping updated_* only — created_* is never touched.
   * A soft-deleted row never matches, here or in any update below.
   */
  update<TTable extends PgTable & Unscoped & NotAppendOnly & NotPauseLedger & NotInvitation>(
    table: TTable,
    values: Partial<Writable<TTable>>,
    where: SQL,
  ): Promise<TTable['$inferSelect'][]>;
  /**
   * The same, naming the one row by its own id — for a table no proof scopes.
   * A service cannot build the `where` above: MB.33 bars it from importing
   * `drizzle-orm` at runtime.
   */
  updateById<
    TTable extends PgTable & Unscoped & NotAppendOnly & NotPauseLedger & NotInvitation & Identified,
  >(
    table: TTable,
    id: string,
    values: Partial<Writable<TTable>>,
  ): Promise<TTable['$inferSelect'][]>;
  /** The same, with `workspace_id = membership.workspaceId` ANDed onto the `where`. */
  updateInWorkspace<TTable extends PgTable & WorkspaceScoped>(
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
  updateByIdInWorkspace<TTable extends PgTable & WorkspaceScoped & Identified>(
    membership: Membership,
    table: TTable,
    id: string,
    values: Partial<WritableInWorkspace<TTable>>,
  ): Promise<TTable['$inferSelect'][]>;
  /**
   * Soft-delete matching rows: stamps deleted_*, leaving the row in place
   * (CLAUDE.md rule 4). A row already deleted never matches, here or below, so
   * it keeps the stamps of whoever deleted it.
   */
  softDelete<
    TTable extends PgTable &
      SoftDeletable &
      Unscoped &
      NotAppendOnly &
      NotPauseLedger &
      NotInvitation,
  >(
    table: TTable,
    where: SQL,
  ): Promise<TTable['$inferSelect'][]>;
  /** The same, scoped by the proof. */
  softDeleteInWorkspace<TTable extends PgTable & SoftDeletable & WorkspaceScoped>(
    membership: Membership,
    table: TTable,
    where: SQL,
  ): Promise<TTable['$inferSelect'][]>;
  /** The same, naming the one row by its own id, for `updateByIdInWorkspace`'s reason. */
  softDeleteByIdInWorkspace<TTable extends PgTable & SoftDeletable & WorkspaceScoped & Identified>(
    membership: Membership,
    table: TTable,
    id: string,
  ): Promise<TTable['$inferSelect'][]>;
  /**
   * `softDelete`, naming the rows by their own ids — the soft-delete twin of
   * `findManyByIds`, for the reason `updateById` gives. An empty list deletes
   * nothing without a statement.
   */
  softDeleteByIds<
    TTable extends PgTable &
      SoftDeletable &
      Unscoped &
      NotAppendOnly &
      NotPauseLedger &
      NotInvitation &
      Identified,
  >(
    table: TTable,
    ids: readonly string[],
  ): Promise<TTable['$inferSelect'][]>;
  /**
   * Insert one row into the compendium tier of a two-tier table, filling
   * `workspace_id` with null — the site role's counterpart of
   * `insertInWorkspace`, under its proof.
   */
  insertInCompendium<TTable extends PgTable & TwoTier>(
    admin: SiteAdmin,
    table: TTable,
    values: WritableInWorkspace<TTable>,
  ): Promise<TTable['$inferSelect'][]>;
  /**
   * Update the one live compendium row with this id, stamping updated_* only.
   * A workspace's row, or a soft-deleted one, is not reached: nothing is
   * written and nothing returned.
   */
  updateByIdInCompendium<TTable extends PgTable & TwoTier & Identified>(
    admin: SiteAdmin,
    table: TTable,
    id: string,
    values: Partial<WritableInWorkspace<TTable>>,
  ): Promise<TTable['$inferSelect'][]>;
  /** Soft-delete the one live compendium row with this id, on the same terms. */
  softDeleteByIdInCompendium<TTable extends PgTable & TwoTier & SoftDeletable & Identified>(
    admin: SiteAdmin,
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
    admin: SiteAdmin,
    at: Date,
  ): Promise<(typeof retiredIngredientSlugs.$inferSelect)[]>;
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
   * Invite an address to become an admin, stamped from the session (MB.69).
   * The token is hashed here and only the hash is stored. Only the columns an
   * invitation starts with are written: it starts pending, whatever a cast
   * smuggled into `values`.
   */
  insertAdminInvitation(
    admin: SiteAdmin,
    values: AdminInvitationValues,
  ): Promise<AdminInvitationRow[]>;
  /**
   * Accept the pending invitation a link's token names, as the session's
   * user, stamping `accepted_at` now and `accepted_by` from the session.
   * Under no role's proof, since the invitee is not yet an admin: the token
   * is what admits, and the session's user must hold the invited address,
   * verified. No row comes back for a token naming no pending invitation, or
   * for a user whose live row holds another address or holds it unverified.
   */
  acceptAdminInvitation(token: string): Promise<AdminInvitationRow[]>;
  /**
   * Revoke a pending invitation, stamping `revoked_at` now; `updated_by` is
   * who revoked. No row comes back for one already accepted, revoked or expired.
   */
  revokeAdminInvitation(admin: SiteAdmin, id: string): Promise<AdminInvitationRow[]>;
  /**
   * Hard-delete, for the join tables that carry no `deleted_at` (MB.34). A
   * table carrying one is rejected by the type, as is one carrying
   * `workspace_id`: no table is both today, and the one that is first adds its
   * proof-scoped counterpart rather than being hard-deleted unscoped. The rows
   * are named by `match`, every column of which they must hold; a list
   * matching nothing deletes nothing without a statement, and a match naming
   * no column is refused rather than emptying the table.
   */
  delete<
    TTable extends PgTable &
      HardDeletable &
      Unscoped &
      NotAppendOnly &
      NotPauseLedger &
      NotInvitation,
  >(
    table: TTable,
    match: ColumnMatch<TTable>,
  ): Promise<TTable['$inferSelect'][]>;
}

/**
 * What `delete` names its rows by: a value per column, or a list the column
 * is in. Values rather than an `SQL` predicate, since a service may not
 * build one (MB.33), and a join table keyed on its pair needs no other
 * comparison (MB.125). The stamps are not columns to match on.
 */
export type ColumnMatch<TTable extends PgTable> = {
  [K in keyof Writable<TTable>]?:
    NonNullable<Writable<TTable>[K]> | readonly NonNullable<Writable<TTable>[K]>[];
};

/** What a possible duplicate carries onto its edge: its trigram similarity to the name. */
export interface SimilarityScore {
  score: number;
}

/** What a list of ingredients is narrowed by. Each part is optional, and absent means no filter. */
export interface IngredientFilter {
  /** Word-similar (`<%`, at 0.5) to the label, the formal name or a live folk name, case- and accent-folded. */
  query?: string;
  /** Every one of these, not any: an entry must carry each id listed. */
  categoryIds?: readonly string[];
  /** The form, folded as `canonical_key` folds it. */
  form?: string;
  /** Only entries citing no live compendium reference: the admin's to-do list (MB.153). */
  withoutReferences?: boolean;
}

/** What a compendium entry carries onto its edge: its word similarity to the query, on a search. */
export interface CompendiumScore {
  score: number | null;
}

/** An ingredient's identity as a write gives it: the three parts its `canonical_key` is built from. */
export interface IngredientIdentity {
  name: string;
  canonicalName?: string | null;
  form?: string | null;
}

/** A vocabulary a member's autofill suggests from. */
export type SuggestingVocabulary =
  typeof planets | typeof zodiacSigns | typeof ingredientForms | typeof deities;

/**
 * Where a vocabulary's in-use values are written: one value to a `column` of
 * `ingredients`, a `list` whose entries are each one (MB.136), or the `name`
 * of a `child` table's rows (MB.167).
 */
export type InUseSource =
  { column: AnyPgColumn } | { list: AnyPgColumn } | { child: typeof ingredientDeities };

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

/** An `ingredients` row, compendium entry or coven's, as a finder returns it. */
export type IngredientRow = typeof ingredients.$inferSelect;

/** A redirect from a slug an entry moved off: the entry, at its current slug, and when it ends. */
export interface SlugRedirect {
  entry: IngredientRow;
  expiresAt: Date;
}

/** An `admin_invitations` row, as a finder or a write returns it. */
export type AdminInvitationRow = typeof adminInvitations.$inferSelect;

/** What an admin invitation starts with; the expiry defaults to seven days out. */
export type AdminInvitationValues = Pick<
  typeof adminInvitations.$inferInsert,
  'email' | 'expiresAt' | 'note'
> & {
  /** The link's token, never stored: the writer stores its hash. */
  token: string;
};

/** What the admin user list is narrowed by (MB.52). Each part is optional, and absent means no filter. */
export interface UserFilter {
  /** A substring of the name or the email, case-insensitive, its `%` and `_` read literally. */
  query?: string;
  /** Only the users who may not yet create a workspace: M5.8's to-do list. */
  awaitingApproval?: boolean;
}

/** One provider account linked to a user, without the tokens its row holds. */
export interface LinkedProvider {
  userId: string;
  providerId: string;
}
