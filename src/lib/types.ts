// Imports nothing: `validation.ts` reaches this file through `errors.ts`, and a
// validation schema may reach no package but zod — so a type that needs a
// table or a library goes in `session.ts` or its own module's `types.ts`
// (claude-docs/modules.md, "Where types live").

/** A connection field's arguments, as the Relay plugin hands them to a resolver. */
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

/** What a repository page finder is asked for. */
export interface PageRequest {
  after?: Cursor;
  before?: Cursor;
  /** Rows to fetch: the page plus one, whose presence says another page follows. */
  limit: number;
  /** Walking backwards (`last`): rows come nearest-first and the page reverses them. */
  inverted: boolean;
}

/**
 * One row of a page, with the position it was found at, and whatever else the
 * finder carries beside it — `Edge` — which becomes a field of its edge.
 */
export type PageEntry<T, Edge extends object = {}> = { cursor: Cursor; node: T } & Edge;

/**
 * A list's size under its filter, and how many of its rows come before a
 * page's first — null on an empty page, which has no first row. Counted from
 * a key and never used to seek, so it labels a page and never finds one.
 */
export interface PageCount {
  totalCount: number;
  countBefore: number | null;
}

/** Where a page stands among them all, for a pager's "Page X of Y". */
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
}

/** What registering a provider with Better Auth takes beyond its credentials. */
export interface ProviderProfile {
  /** The profile field naming the provider account; the first one present, where profiles come in more than one shape. */
  accountId: readonly [string, ...string[]];
  /** Whether a sign-in takes the provider's word that the address is verified. */
  vouches: boolean;
  /** The provider's own options, read when Better Auth is configured. */
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

/** One of a user's provider accounts: the row id `/unlink-account` takes, and its provider. */
export interface LinkedAccount {
  id: string;
  providerId: ProviderId;
}

/** One rule a value broke, pathed to the input field it is about. */
export interface ValidationIssue {
  /** In the shape of the operation's input — `['folkNames', 2]`; empty for no one field. */
  path: (string | number)[];
  message: string;
}

/**
 * What a failed GraphQL request leaves a form to say, as `readGraphqlFailure`
 * reads it (src/lib/graphql-failure.ts): under one of the form's own fields,
 * or in its alert region. Never both.
 */
export interface Failure {
  /** A VALIDATION issue about one of the fields the form named, with that field's name. */
  field?: { name: string; message: string };
  /** Everything else, as one readable sentence. */
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

/** A category group's two colours, one per theme, as its row stores them. */
export interface GroupColors {
  colorDark: string;
  colorLight: string;
}

/** Which of a group's two colours: the one the dark theme wears, or the light. */
export type GroupColorColumn = keyof GroupColors;

/**
 * The two axes of a colour picker's area, as it lays them out for a format:
 * saturation across, and brightness or lightness up, 100 at the top.
 */
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

/**
 * What `renderShortCitation` reads: the four fields a Chicago short form is
 * made of, so a surface holding a source's citation need carry no more.
 */
export type ShortCitationFields = Pick<CitationFields, 'kind' | 'title' | 'authors' | 'container'>;

/** One run of a rendered citation, set in italic or roman. */
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

/**
 * The modal a list page has open over it, by its address: `'new'` for the
 * add form, `{ edit }` for the row whose slug or id it edits, none for no
 * modal (src/lib/list-href.ts).
 */
export type ListDialog = 'new' | { edit: string };

/**
 * A `ListDialog` as the address writes it: `new` a bare flag, `edit` the
 * row's slug or id. A type alias rather than an interface, so it passes as
 * `ListHrefParams` on its own: an interface carries no index signature.
 */
export type ListDialogParams = { new: boolean; edit: string | undefined };

/** One cursor, for the page before or the page after (`pagerHrefs`, src/lib/list-href.ts). */
export type PagerCursor = { after: string } | { before: string };

/**
 * The pager's two ends; an end with no page is left out. Generic over the
 * href's type, so a page's builder keeps Next's typed `Route` while this file
 * imports nothing: `Pager` takes any string.
 */
export interface PagerHrefs<Href extends string = string> {
  previousHref: Href | undefined;
  nextHref: Href | undefined;
}

/** The signed-in person as the application shell draws them. */
export interface ShellViewer {
  /** Their user id, which keys the forms' offline copies to them. */
  id?: string;
  /** The name the site shows for them; the account button's text and its initials. */
  name: string;
  /** A curator or a site admin: the shell adds the Admin and Your Coven links. */
  canCurate: boolean;
  /** Holds `canCreateWorkspace`, read from the user row, never the session. */
  canCreate: boolean;
  /** Their address is verified. Until it is, the shell offers an account menu with Sign Out and nothing else. */
  verified: boolean;
  /**
   * How many coven invitations wait for their verified address: the
   * account menu's count and the landing's notice. Never read for an
   * unverified account, which reads 0.
   */
  pendingInvitations: number;
}

/** One coven the viewer belongs to, as the shell's switcher and brand link need it. */
export interface ShellWorkspace {
  id: string;
  slug: string;
  name: string;
  canReadMembers: boolean;
  /** The viewer’s role there may invite (an owner’s alone): the invitations page is a 404 without it. */
  canInvite: boolean;
  /** The viewer’s role there may create ingredients: false lists the coven in Add Ingredient, disabled. */
  canWrite: boolean;
}

/** The viewer and their covens together: what the shell is drawn from (`src/lib/viewer.ts`). */
export interface ShellContext {
  viewer: ShellViewer;
  workspaces: ShellWorkspace[];
}
