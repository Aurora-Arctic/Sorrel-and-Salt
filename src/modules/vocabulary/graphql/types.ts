import type {
  ImplementableObjectRef,
  InputFieldBuilder,
  InputFieldMap,
  InputShapeFromFields,
  ObjectFieldsShape,
  ObjectRef,
} from '@pothos/core';
import type DataLoader from 'dataloader';
import type { Loaders } from '../../../graphql/loaders';
import type { BuilderTypes, Defined } from '../../../graphql/types';
import type { Session } from '../../../lib/session';

/** What every curated row carries, and its type exposes. */
export interface CuratedRow {
  id: string;
  name: string;
  slug: string;
  description: string;
}

/** A loader a write leaves stale, by its name on the request context. */
export type LoaderName = keyof Loaders;

/**
 * A curated input as its services take it: the name and description every
 * vocabulary's carries, the parent's id under `Key` where the rows are filed
 * under one, and the vocabulary's own fields, nulls made absent.
 */
export type CuratedInput<Extra extends InputFieldMap, Key extends string> = {
  name: string;
  description: string;
} & Record<Key, string> &
  Defined<InputShapeFromFields<Extra>>;

/** The row a value is filed under — a category's group, a deity's tradition. */
export interface CuratedParent<ParentRow, Key extends string> {
  /** The field the type reads it as: `group`, `tradition`. */
  field: string;
  /** The row's column holding its id, and the input field the admin sets it with. */
  key: Key;
  type: ObjectRef<BuilderTypes, ParentRow>;
  /** The request's loader for it, by id. */
  loader: (loaders: Loaders) => DataLoader<string, ParentRow>;
}

/** What `curatedVocabularyWrites` is told: everything that differs between two vocabularies. */
export interface CuratedVocabulary<
  Row extends CuratedRow,
  Extra extends InputFieldMap,
  Key extends string,
  ParentRow,
> {
  /** The type, named and not yet implemented: its name names the input and the three writes. */
  ref: ImplementableObjectRef<BuilderTypes, Row>;
  parent?: CuratedParent<ParentRow, Key>;
  /** The type's fields beyond the four every curated row has and the parent. */
  fields?: ObjectFieldsShape<BuilderTypes, Row>;
  /** The input's fields beyond the name, the description and the parent's id. */
  input?: (t: InputFieldBuilder<BuilderTypes, 'InputObject'>) => Extra;
  /** The three admin writes, each refusing anyone but a site admin again. */
  services: {
    create: (session: Session, input: CuratedInput<Extra, Key>) => Promise<Row>;
    update: (session: Session, id: string, input: CuratedInput<Extra, Key>) => Promise<Row>;
    delete: (session: Session, id: string, moveTo?: string) => Promise<void>;
  };
  /**
   * Present when a delete moves the rows filed under this one to `moveTo`
   * first: the loaders that move leaves stale, cleared after the delete
   * beside `clears`.
   */
  moveTo?: readonly LoaderName[];
  /** The loaders an update or a delete leaves stale, cleared after either. */
  clears: readonly LoaderName[];
  /** What the SDL says of the update and the delete; the create says nothing. */
  descriptions: { update: string; delete: string };
}
