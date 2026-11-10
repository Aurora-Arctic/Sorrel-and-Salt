// Imports nothing, because `validation.ts` reaches this file and may reach no package but zod
// (claude-docs/modules.md, "Where types live").

export interface ConnectionArgs {
  first?: number | null;
  last?: number | null;
  after?: string | null;
  before?: string | null;
}

/**
 * A position in a list: each part of the row's sort key as Postgres prints it, and its id as the tie-break. Never an offset, so an insert ahead cannot shift
 * the page. The parts are text as a `timestamptz` read into a `Date` loses its microseconds; a list checks its own key's length.
 */
export interface Cursor {
  key: readonly string[];
  id: string;
}

export interface PageRequest {
  after?: Cursor;
  before?: Cursor;
  /** Rows to fetch: the page plus one, whose presence says another page follows. */
  limit: number;
  /** Walking backwards (`last`): rows come nearest-first and the page reverses them. */
  inverted: boolean;
}

export type PageEntry<T, Edge extends object = {}> = { cursor: Cursor; node: T } & Edge;

/** Counted from a key and never used to seek, so it labels a page and never finds one. */
export interface PageCount {
  totalCount: number;
  countBefore: number | null;
}

export interface PagePosition {
  page: number;
  pages: number;
}

export interface Page<T, Edge extends object = {}> {
  edges: ({ cursor: string; node: T } & Edge)[];
  pageInfo: {
    startCursor: string | null;
    endCursor: string | null;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export type ProviderId = 'google' | 'discord' | 'facebook' | 'microsoft';

export interface SocialProvider {
  id: ProviderId;
  label: string;
  /** Left off the sign-in screens and the account page's offer to link; registration and an existing link stay. */
  hidden?: true;
}

export interface ProviderProfile {
  /** The profile field naming the provider account; the first one present, where profiles come in more than one shape. */
  accountId: readonly [string, ...string[]];
  vouches: boolean;
  extra?: () => { tenantId: string };
}

/**
 * A profile for every id, none optional: a provider added to `ProviderId`
 * without one fails to compile, where a switch without a default would let it
 * build and never register.
 */
export type ProviderProfiles<Id extends string = ProviderId> = {
  readonly [P in Id]: ProviderProfile;
};

export interface LinkedAccount {
  id: string;
  providerId: ProviderId;
}

export interface AccountPasskey {
  id: string;
  name: string | null;
  createdAt: string;
}

export interface ValidationIssue {
  /** In the shape of the operation's input — `['folkNames', 2]`; empty for no one field. */
  path: (string | number)[];
  message: string;
}

/** Under one of the form's own fields or in its alert region, never both. */
export interface Failure {
  /** A VALIDATION issue about one of the fields the form named, with that field's name. */
  field?: { name: string; message: string };
  alert?: string;
}

export type Message = { to: string; subject: string; text: string; html: string };

export type Outgoing = { url: string; headers: Record<string, string>; body: unknown };

/** Optional when the document declares no variables, required when it does. */
export type VariablesArg<TVariables> =
  TVariables extends Record<string, never> ? [variables?: TVariables] : [variables: TVariables];

/** What is read off each error in the chain; `cause` is typed on `Error` only from ES2022's lib. */
export interface ChainedError {
  cause?: unknown;
  code?: unknown;
  constraint_name?: unknown;
}

export interface GroupColors {
  colorDark: string;
  colorLight: string;
}

export type GroupColorColumn = keyof GroupColors;

/** Saturation across, brightness or lightness up, 100 at the top. */
export type AreaSpace = 'hsb' | 'hsl';

/**
 * The five kinds of source `references.kind` holds, spelled here as a lib file imports no module; a row's `ReferenceKind` must stay assignable to it, so a
 * sixth kind fails the type check at the renderer's callers.
 */
export type CitationKind = 'book' | 'chapter' | 'article' | 'entry' | 'web_page';

/**
 * What `renderCitation` reads: a `references` row's own fields, each text as
 * Chicago prints it and absent or null when not given, the two days as
 * `YYYY-MM-DD`.
 */
export interface CitationFields {
  kind: CitationKind;
  title: string;
  authors?: string | null;
  container?: string | null;
  contributors?: string | null;
  edition?: string | null;
  volume?: string | null;
  issue?: string | null;
  series?: string | null;
  place?: string | null;
  publisher?: string | null;
  published?: string | null;
  pages?: string | null;
  host?: string | null;
  url?: string | null;
  modified?: string | null;
  accessed?: string | null;
  note?: string | null;
}

export type ShortCitationFields = Pick<CitationFields, 'kind' | 'title' | 'authors' | 'container'>;

export interface CitationPart {
  text: string;
  italic: boolean;
}

/**
 * A list address's query, for `listHref`: a string is a pair, a list one pair
 * per value (`forms=Herb&forms=Oil`), `true` a bare flag (`new`, `awaiting`), and
 * `undefined`, `false`, `''` or an empty list is left out.
 */
export type ListHrefParams = Readonly<
  Record<string, string | readonly string[] | boolean | undefined>
>;

export type ListDialog = 'new' | { edit: string };

/** A type alias, not an interface, so it passes as `ListHrefParams`: an interface carries no index signature. */
export type ListDialogParams = { new: boolean; edit: string | undefined };

export type PagerCursor = { after: string } | { before: string };

/** Generic over the href's type, so a page's builder keeps Next's typed `Route` while this file imports nothing. */
export interface PagerHrefs<Href extends string = string> {
  previousHref: Href | undefined;
  nextHref: Href | undefined;
}

export interface ShellViewer {
  /** Their user id, which keys the forms' offline copies to them. */
  id?: string;
  name: string;
  /** A curator or a site admin: the shell adds the Admin and Your Coven links. */
  canCurate: boolean;
  /** Holds `canCreateWorkspace`, read from the user row, never the session. */
  canCreate: boolean;
  /** Their address is verified. Until it is, the shell offers an account menu with Sign Out and nothing else. */
  verified: boolean;
  /** Never read for an unverified account, which reads 0. */
  pendingInvitations: number;
  /** Open support requests assigned to them; 0 unless verified and staff. */
  assignedSupport: number;
  /** Their own support requests waiting on them; 0 unless verified. */
  waitingSupport: number;
  /** The site access pause standing on them, its end `null` when it has none: the shell says so, and offers nothing it closes. */
  accessPause?: { until: Date | null };
}

export interface ShellWorkspace {
  id: string;
  slug: string;
  name: string;
  canReadMembers: boolean;
  /** The viewer’s role there may invite (a steward’s alone): the invitations page is a 404 without it. */
  canInvite: boolean;
  /** The viewer’s role there may create ingredients: false leaves the coven out of every write target, Add Ingredient's among them. */
  canWrite: boolean;
  /** The pause an owner set on the viewer's seat there, or null. `until` null is open-ended. A paused coven reads false for every flag above. */
  paused: { until: Date | null } | null;
}

export interface ShellContext {
  viewer: ShellViewer;
  workspaces: ShellWorkspace[];
}

/** The three documents an account agrees to at once, by their part of the joint version: the terms include the other two. */
export type AgreementPart = 'terms' | 'disclaimer' | 'ethics';

export type AgreementDocumentKey = 'terms' | 'disclaimer' | 'code-of-ethics';

/** The version numbers in force, one per document, each 0 while its document has no published version. */
export type AgreementVersion = Record<AgreementPart, number>;

export type AgreedVersion = Record<AgreementPart, number | null | undefined>;

export interface AgreedColumns {
  agreedTermsVersion: number | null;
  agreedDisclaimerVersion: number | null;
  agreedEthicsVersion: number | null;
}

/** A module kept out of the page's first-load scripts, imported at most once however many callers ask (src/lib/use-lazy-module.ts). */
export interface LazyModule<M> {
  /** Starts the import on the first call and gives every later call the same promise; a failed import is forgotten, so the next call tries again. */
  load: () => Promise<M>;
  /** The module once it has arrived, else null. */
  loaded: () => M | null;
}

/** Spread on the control that opens a lazy module's dialog or menu: the pointer reaching it, the focus reaching it or a press beginning on it starts the load. */
export interface PreloadHandlers {
  onPointerEnter: () => void;
  onFocus: () => void;
  onPointerDown: () => void;
}

/** What a coven role may do on a page: each flag is the statement its service asserts, never a rank. */
export interface CovenAccess {
  canUpdateCoven: boolean;
  canDeleteCoven: boolean;
  canReadMembers: boolean;
  canReadMemberEmails: boolean;
  canInvite: boolean;
  canChangeRoles: boolean;
  canRemoveMembers: boolean;
  canPauseMembers: boolean;
  canCreateIngredient: boolean;
  canUpdateIngredient: boolean;
  canDeleteIngredient: boolean;
  canMakeOurs: boolean;
  canUpdateStock: boolean;
  canAddToCupboard: boolean;
  canCreateSpell: boolean;
  canUpdateSpell: boolean;
  canDeleteSpell: boolean;
  canCreateWorking: boolean;
  canUpdateWorking: boolean;
  canDeleteWorking: boolean;
}

/** What a mail-sending service needs from the request: the site origin its links point at. */
export interface OriginNotifier {
  origin(): Promise<string>;
}

/** The compendium list's filter for the entries holding a curated value, keyed as the list's address parameters: slugs for categories and deities, names for the rest. */
export type HeldBy = Partial<
  Record<'categories' | 'deities' | 'forms' | 'zodiac' | 'celestialBodies', string[]>
>;
