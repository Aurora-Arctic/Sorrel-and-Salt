import type {
  SchemaTypes as CoreSchemaTypes,
  InputFieldMap,
  InputShapeFromFields,
  ObjectFieldsShape,
  ObjectRef,
} from '@pothos/core';
import type { FieldAuthScopes } from '@pothos/plugin-scope-auth';
import type { EmailVerificationSender, InvitationSender } from '@/modules/identity';
import type { Session } from '../lib/session';
import type { Cursor, PageCount, PageEntry, PageRequest, ValidationIssue } from '../lib/types';
import type { Loaders } from './loaders';

/** What every resolver receives: who is asking, and this request's loaders and senders. */
export interface Context {
  /** `null` when signed out: the endpoint answers, and a scope or service refuses. */
  session: Session | null;
  loaders: Loaders;
  /** Bound to this request's host and cookie: the email page's mail goes out through it. */
  emailVerification: EmailVerificationSender;
  /** Bound to this request's host: an admin invitation's link goes out through it. */
  invitations: InvitationSender;
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
  // `self` takes a user id and holds when it is the session's own.
  AuthScopes: {
    signedIn: boolean;
    admin: boolean;
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

export type ErrorCode = 'VALIDATION' | 'FORBIDDEN' | 'NOT_FOUND';

/** What a mapped error carries under `extensions`; `fieldErrors` only on VALIDATION. */
export interface ErrorExtensions {
  code: ErrorCode;
  fieldErrors?: ValidationIssue[];
}

/**
 * `t.pagedConnection`'s options. Generic over Pothos's own `SchemaTypes`, not
 * the app's above: the `RootFieldBuilder` augmentation in pagination.ts passes
 * its own `Types`, and a merged declaration keeps Pothos's type parameters.
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
  /** The field's own arguments, beside the four the connection adds. */
  args?: Args;
  /**
   * The field's scope (M5.7), checked before `resolve` is asked: the second
   * check in front of a service that refuses again.
   */
  authScopes?: FieldAuthScopes<Types, ParentShape, InputShapeFromFields<Args>>;
  /**
   * One page from a keyset finder. It receives a decoded, clamped
   * `PageRequest` and never the client's `first`/`after`, so it cannot skip
   * the maximum or read a cursor as an offset.
   */
  resolve: (
    parent: ParentShape,
    args: InputShapeFromFields<Args>,
    page: PageRequest,
    context: Types['Context'],
  ) => Promise<PageEntry<Node, Edge>[]>;
  /** Fields of the edge beside `cursor` and `node`, read off what each entry carries. */
  edgeFields?: ObjectFieldsShape<Types, { cursor: string; node: Node } & Edge>;
  /**
   * The list's size under the field's arguments, and how many of its rows
   * come before `start` — the page's first row, none on an empty page.
   * Emitted as `totalCount` and `countBefore`, and called once per
   * connection, only when one of the two is selected.
   */
  count?: (
    parent: ParentShape,
    args: InputShapeFromFields<Args>,
    start: Cursor | undefined,
    context: Types['Context'],
  ) => Promise<PageCount>;
}

/** What a counted connection's two fields read: one count, asked for on first use. */
export interface Counted {
  count: () => Promise<PageCount>;
}

/** The builder's own types, as Pothos extends `SchemaTypes`: what a ref is typed under. */
export type BuilderTypes = PothosSchemaTypes.ExtendDefaultTypes<SchemaTypes>;

/** An argument object with each null made absent: what `definedArgs` answers. */
export type Defined<T> = { [Name in keyof T]: Exclude<T[Name], null> };

/** A picker's search, as `suggestionConnection` calls it: the caller's, a coven or none, a query. */
export type Suggest<Node> = (
  session: Session,
  workspaceId: string | null | undefined,
  query: string,
  page: PageRequest,
) => Promise<PageEntry<Node>[]>;
