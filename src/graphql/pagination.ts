import {
  PothosValidationError,
  RootFieldBuilder,
  type FieldKind,
  type FieldRef,
  type InputFieldMap,
  type InputShapeFromFields,
  type ObjectFieldsShape,
  type ObjectRef,
  type SchemaTypes,
} from '@pothos/core';
import { InvalidCursor } from '../lib/errors';
import {
  type ConnectionArgs,
  type PageEntry,
  type PageRequest,
  resolvePage,
} from '../lib/pagination';

// `t.pagedConnection`, added to every field builder the way the Relay plugin
// adds `t.connection`: a method, so the parent's shape comes from the builder
// rather than being inferred through it. Imported by `builder.ts` for that
// side effect.

export interface PagedConnectionOptions<
  Types extends SchemaTypes,
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
}

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

fieldBuilderProto.pagedConnection = function pagedConnection({ resolve, edgeFields, ...options }) {
  return this.connection(
    {
      ...options,
      resolve: async (parent: unknown, args: ConnectionArgs, context: object) => {
        try {
          return await resolvePage(args, (page) => resolve(parent, args as never, page, context));
        } catch (error) {
          // Bad input, so the client sees why; any other error stays masked.
          if (error instanceof InvalidCursor) throw new PothosValidationError(error.message);
          throw error;
        }
      },
    } as never,
    {},
    (edgeFields ? { fields: edgeFields } : {}) as never,
  ) as never;
};
