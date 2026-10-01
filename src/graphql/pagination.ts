import {
  PothosValidationError,
  RootFieldBuilder,
  type FieldKind,
  type FieldRef,
  type InputFieldMap,
  type SchemaTypes,
} from '@pothos/core';
import { InvalidCursor } from '../lib/errors';
import { decodeCursor, resolvePage } from '../lib/pagination';
import type { ConnectionArgs, PageCount } from '../lib/types';
import type { PagedConnectionOptions, Counted } from './types';

// `t.pagedConnection`, added to every field builder the way the Relay plugin
// adds `t.connection`: a method, so the parent's shape comes from the builder
// rather than being inferred through it. Imported by `builder.ts` for that
// side effect.

declare global {
  export namespace PothosSchemaTypes {
    export interface RootFieldBuilder<
      Types extends SchemaTypes,
      ParentShape,
      Kind extends FieldKind = FieldKind,
    > {
      /**
       * The one way to declare a list field (CLAUDE.md rule 8): a Relay
       * connection whose resolver is handed a page rather than arguments.
       * `tests/guards/pagination.test.ts` fails a `.connection(` anywhere else.
       */
      pagedConnection: <Node, Args extends InputFieldMap = {}, Edge extends object = {}>(
        options: PagedConnectionOptions<Types, ParentShape, Node, Args, Edge>,
      ) => FieldRef<Types, unknown, Kind>;
    }
  }
}

const fieldBuilderProto = RootFieldBuilder.prototype as PothosSchemaTypes.RootFieldBuilder<
  SchemaTypes,
  unknown,
  FieldKind
>;

fieldBuilderProto.pagedConnection = function pagedConnection({
  resolve,
  edgeFields,
  count,
  ...options
}) {
  return this.connection(
    {
      ...options,
      resolve: async (parent: unknown, args: ConnectionArgs, context: object) => {
        try {
          const page = await resolvePage(args, (request) =>
            resolve(parent, args as never, request, context),
          );
          if (!count) return page;
          const { startCursor } = page.pageInfo;
          const start = startCursor === null ? undefined : decodeCursor(startCursor);
          let counted: Promise<PageCount> | undefined;
          return {
            ...page,
            count: () => (counted ??= count(parent, args as never, start, context)),
          } satisfies Counted;
        } catch (error) {
          // Bad input, so the client sees why; any other error stays masked.
          if (error instanceof InvalidCursor) throw new PothosValidationError(error.message);
          throw error;
        }
      },
    } as never,
    (count ? { fields: countFields } : {}) as never,
    (edgeFields ? { fields: edgeFields } : {}) as never,
  ) as never;
};

/**
 * `totalCount` and `countBefore`, priced as `pageInfo` is: a field under the
 * connection, at the page size, however many rows the count reads.
 */
function countFields(t: PothosSchemaTypes.ObjectFieldBuilder<SchemaTypes, Counted>) {
  return {
    totalCount: t.int({
      description: 'How many rows the list holds under its arguments.',
      resolve: async (connection) => (await connection.count()).totalCount,
    }),
    countBefore: t.int({
      nullable: true,
      description:
        "How many of the list's rows come before this page's first edge: 0 on the first page, so the page is floor(countBefore / size) + 1. Null on an empty page.",
      resolve: async (connection) => (await connection.count()).countBefore,
    }),
  };
}
