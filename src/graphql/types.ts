import type {
  SchemaTypes as CoreSchemaTypes,
  InputFieldMap,
  InputShapeFromFields,
  ObjectFieldsShape,
  ObjectRef,
} from '@pothos/core';
import type { FieldAuthScopes } from '@pothos/plugin-scope-auth';
import type { MemberPauseNotifier } from '@/modules/coven';
import type {
  AccessPauseNotifier,
  EmailVerificationSender,
  InvitationSender,
  PasswordSetter,
} from '@/modules/identity';
import type { DocumentMailingNotifier } from '@/modules/documents';
import type { SupportNotifier, TimeoutNotifier } from '@/modules/support';
import type { Session } from '../lib/session';
import type { Cursor, PageCount, PageEntry, PageRequest, ValidationIssue } from '../lib/types';
import type { Loaders } from './loaders';

export interface Context {
  /** `null` when signed out: the endpoint answers, and a scope or service refuses. */
  session: Session | null;
  /** Set while a pause stands on the signed-in user: `session` is then `null`, and a refusal says the access is paused. */
  accessPause?: { until: Date | null };
  loaders: Loaders;
  /** Bound to this request's host and cookie. */
  emailVerification: EmailVerificationSender;
  /** Bound to this request's host. */
  invitations: InvitationSender;
  /** Bound to this request's cookie. */
  passwords: PasswordSetter;
  /** Bound to this request's host. */
  support: SupportNotifier;
  /** Bound to this request's host. */
  pauses: TimeoutNotifier & AccessPauseNotifier & MemberPauseNotifier;
  /** Bound to this request's host. */
  documents: DocumentMailingNotifier;
  /** The caller's address from the platform's forwarded-for header; `null` when there is none. Only the signed-out support send reads it. */
  clientIp: string | null;
}

export interface SchemaTypes {
  Context: Context;
  // Non-null unless a field says otherwise, as DESIGN.md §7's sketch reads:
  // a nullable field is the one that means something by it.
  DefaultFieldNullability: false;
  // A connection's edges and nodes are never null: a page holds rows.
  DefaultEdgesNullability: { list: false; items: false };
  DefaultNodeNullability: false;
  // The schema's second check, behind the service layer's (DESIGN.md §7).
  AuthScopes: {
    signedIn: boolean;
    admin: boolean;
    curator: boolean;
    self: string;
  };
  Scalars: {
    // `DateTimeISO` rather than graphql-scalars' `DateTime`, which hands the
    // serializer's caller a Date and leaves the string to JSON.stringify.
    DateTime: { Input: Date; Output: Date };
    // `YYYY-MM-DD` both ways, as a `date` column reads in Drizzle's string mode.
    LocalDate: { Input: string; Output: string };
    ID: { Input: string; Output: string };
  };
}

export type ErrorCode =
  'VALIDATION' | 'FORBIDDEN' | 'ACCESS_PAUSED' | 'NOT_FOUND' | 'STALE_WRITE' | 'RATE_LIMITED';

/**
 * What a mapped error carries under `extensions`: `fieldErrors` only on
 * VALIDATION, `currentRevision` only on STALE_WRITE.
 */
export interface ErrorExtensions {
  code: ErrorCode;
  fieldErrors?: ValidationIssue[];
  currentRevision?: number;
  pausedUntil?: string | null;
  /** Set with `RATE_LIMITED`: the HTTP status and the Retry-After header Yoga sends. */
  http?: { status: number; headers: Record<string, string> };
}

/**
 * `t.pagedConnection`'s options. Generic over Pothos's own `SchemaTypes`, because the `RootFieldBuilder`
 * augmentation in pagination.ts passes its own `Types`.
 */
export interface PagedConnectionOptions<
  Types extends CoreSchemaTypes,
  ParentShape,
  Node,
  Args extends InputFieldMap,
  Edge extends object,
> {
  type: ObjectRef<Types, Node>;
  description?: string;
  args?: Args;
  /** Checked before `resolve` is asked; a service refuses again. */
  authScopes?: FieldAuthScopes<Types, ParentShape, InputShapeFromFields<Args>>;
  /** One page from a keyset finder. It gets a decoded, clamped `PageRequest`, never the client's `first`/`after`. */
  resolve: (
    parent: ParentShape,
    args: InputShapeFromFields<Args>,
    page: PageRequest,
    context: Types['Context'],
  ) => Promise<PageEntry<Node, Edge>[]>;
  edgeFields?: ObjectFieldsShape<Types, { cursor: string; node: Node } & Edge>;
  /**
   * The list's size under the field's arguments, and how many rows come before `start`.
   * Called once per connection, only when `totalCount` or `countBefore` is selected.
   */
  count?: (
    parent: ParentShape,
    args: InputShapeFromFields<Args>,
    start: Cursor | undefined,
    context: Types['Context'],
  ) => Promise<PageCount>;
}

export interface Counted {
  count: () => Promise<PageCount>;
}

export type BuilderTypes = PothosSchemaTypes.ExtendDefaultTypes<SchemaTypes>;

export type Defined<T> = { [Name in keyof T]: Exclude<T[Name], null> };

export type Suggest<Node> = (
  session: Session,
  workspaceId: string | null | undefined,
  query: string,
  page: PageRequest,
) => Promise<PageEntry<Node>[]>;
