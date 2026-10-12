import type { ImplementableObjectRef, InputFieldMap, ObjectRef } from '@pothos/core';
import { builder } from '../../../graphql/builder';
import { definedArgs, sessionOf } from '../../../graphql/context-helpers';
import type { Loaders } from '../../../graphql/loaders';
import type { BuilderTypes } from '../../../graphql/types';
import type {
  CuratedInput,
  CuratedParent,
  CuratedRow,
  CuratedVocabulary,
  LoaderName,
} from './types';

// A curated vocabulary's type, its input and its three admin writes, written
// once for the seven, as the astrology file once looped over its two
// (claude-docs/graphql/schema.md, "Curated vocabularies"). The writes are the
// site admin's, scoped here and refused again by the service, which is the
// real gate. Every description is the caller's, passed through, so the SDL is
// what each file declared by hand.

/**
 * Implements `ref` as `id`, `name`, `slug`, `description`, the parent and
 * `fields`; registers `<Type>Input`, written whole with no slug, which follows
 * the name; and the `create<Type>`, `update<Type>` and `delete<Type>`
 * mutations, the delete answering the id. Answers the implemented ref.
 */
export function curatedVocabularyWrites<
  Row extends CuratedRow & Record<Key, string>,
  Extra extends InputFieldMap = {},
  Key extends string = never,
  ParentRow = unknown,
>(vocabulary: CuratedVocabulary<Row, Extra, Key, ParentRow>): ObjectRef<BuilderTypes, Row> {
  const { services, moveTo, clears, descriptions } = vocabulary;
  // Pothos reads a field's result through conditional types a generic row
  // leaves open, so the body works on the rows as written; the signature is
  // what each caller is checked against.
  const ref = vocabulary.ref as unknown as ImplementableObjectRef<BuilderTypes, CuratedRow>;
  const parent = vocabulary.parent as unknown as
    CuratedParent<object, keyof CuratedRow> | undefined;
  const type = ref.name;

  ref.implement({
    fields: (t) => ({
      id: t.id({ resolve: (row) => row.id }),
      name: t.string({ resolve: (row) => row.name }),
      slug: t.string({ resolve: (row) => row.slug }),
      description: t.string({ resolve: (row) => row.description }),
      ...(parent && {
        [parent.field]: t.field({
          type: parent.type,
          resolve: (row, _args, { loaders }) => parent.loader(loaders).load(row[parent.key]),
        }),
      }),
      ...vocabulary.fields?.(t as never),
    }),
  });

  const input = builder.inputType(`${type}Input`, {
    fields: (t) => ({
      name: t.string({ required: true }),
      description: t.string({ required: true }),
      ...(parent && { [parent.key]: t.id({ required: true }) }),
      ...vocabulary.input?.(t),
    }),
  });
  // The input as the services take it: a null optional field made absent.
  const inputOf = (args: { input: object }) => definedArgs(args.input) as CuratedInput<Extra, Key>;

  builder.mutationField(`create${type}`, (t) =>
    t.field({
      type: ref,
      args: { input: t.arg({ type: input, required: true }) },
      authScopes: { admin: true },
      resolve: (_root, args, context) => services.create(sessionOf(context), inputOf(args)),
    }),
  );

  builder.mutationField(`update${type}`, (t) =>
    t.field({
      type: ref,
      description: descriptions.update,
      args: {
        id: t.arg.id({ required: true }),
        input: t.arg({ type: input, required: true }),
      },
      authScopes: { admin: true },
      resolve: async (_root, args, context) => {
        const row = await services.update(sessionOf(context), args.id, inputOf(args));
        clear(context.loaders, clears);
        return row;
      },
    }),
  );

  builder.mutationField(`delete${type}`, (t) =>
    t.id({
      description: descriptions.delete,
      args: {
        id: t.arg.id({ required: true }),
        ...(moveTo && { moveTo: t.arg.id({ required: false }) }),
      },
      authScopes: { admin: true },
      resolve: async (_root, { id, moveTo: target }, context) => {
        await services.delete(sessionOf(context), id, target ?? undefined);
        clear(context.loaders, [...clears, ...(moveTo ?? [])]);
        return id;
      },
    }),
  );

  return vocabulary.ref;
}

/**
 * Each loader named, emptied: root mutation fields run in turn within one
 * request, so an earlier one may have read the row written, or a row it moved
 * or re-slugged, and what follows must read this write's.
 */
function clear(loaders: Loaders, names: readonly LoaderName[]): void {
  for (const name of names) loaders[name].clearAll();
}
