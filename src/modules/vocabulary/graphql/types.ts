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

export interface CuratedRow {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export type LoaderName = keyof Loaders;

/** A curated input as its services take it: the name and description, the parent's id under `Key` where rows are filed under one, and the vocabulary's own fields, nulls made absent. */
export type CuratedInput<Extra extends InputFieldMap, Key extends string> = {
  name: string;
  description: string;
} & Record<Key, string> &
  Defined<InputShapeFromFields<Extra>>;

export interface CuratedParent<ParentRow, Key extends string> {
  field: string;
  /** The row's column holding its id, and the input field the admin sets it with. */
  key: Key;
  type: ObjectRef<BuilderTypes, ParentRow>;
  loader: (loaders: Loaders) => DataLoader<string, ParentRow>;
}

export interface CuratedVocabulary<
  Row extends CuratedRow,
  Extra extends InputFieldMap,
  Key extends string,
  ParentRow,
> {
  ref: ImplementableObjectRef<BuilderTypes, Row>;
  parent?: CuratedParent<ParentRow, Key>;
  fields?: ObjectFieldsShape<BuilderTypes, Row>;
  input?: (t: InputFieldBuilder<BuilderTypes, 'InputObject'>) => Extra;
  /** The three admin writes, each refusing anyone but a site admin again. */
  services: {
    create: (session: Session, input: CuratedInput<Extra, Key>) => Promise<Row>;
    update: (session: Session, id: string, input: CuratedInput<Extra, Key>) => Promise<Row>;
    delete: (session: Session, id: string, moveTo?: string) => Promise<void>;
  };
  /** Present when a delete moves the rows filed under this one to `moveTo` first: the loaders that move leaves stale, cleared after the delete beside `clears`. */
  moveTo?: readonly LoaderName[];
  clears: readonly LoaderName[];
  /** What the SDL says of the update and the delete; the create says nothing. */
  descriptions: { update: string; delete: string };
}
