import type { InputFieldRef } from '@pothos/core';
import { builder } from '../../../graphql/builder';
import { sessionOf, suggestionConnection } from '../../../graphql/context-helpers';
import { AuditInfo } from '../../../graphql/schema/audit';
import type { BuilderTypes } from '../../../graphql/types';
import { citationText } from '../../../lib/citation';
import type { CitationFields } from '../../../lib/types';
import { NAME_BASES, REFERENCE_KINDS } from '../schema/ingredient-enums';
import {
  createReference,
  getReference,
  suggestReferences,
  updateReference,
} from '../services/references';
import type { CitedReference, ReferenceRow } from '../types';
import { REFERENCE_TEXT_FIELDS } from '../validation/reference-format';
import type { ReferenceTextField } from '../validation/types';

// A reference as DESIGN.md §7 sketches it: its fields, the tier as `isGlobal`, and the citation rendered on the server by the one
// renderer. `Ingredient.references` reads through the request's loader; `workspaceId` stays off the wire, as it does on `Ingredient`.

/** Every text field but the title, which every kind of reference requires. */
const OPTIONAL_FIELDS = REFERENCE_TEXT_FIELDS.filter(
  (field): field is Exclude<ReferenceTextField, 'title'> => field !== 'title',
);

/** The fields a day is written in, which the wire types as one; the rest are text. */
const DAY_FIELDS: ReadonlySet<ReferenceTextField> = new Set(['modified', 'accessed']);

/** What the type says of a field its name does not explain. */
const DESCRIPTION_OF: Partial<Record<ReferenceTextField, string>> = {
  container:
    "The book of a chapter, the journal of an article, the reference work of an entry, or a web page's site.",
  host: 'The repository a print work was read through.',
};

export const ReferenceKindEnum = builder.enumType('ReferenceKind', { values: REFERENCE_KINDS });

export const NameBasisEnum = builder.enumType('NameBasis', {
  values: NAME_BASES,
  description:
    'How a citation names the ingredient: prints the formal name (stated), heads a common name a cited authority maps to it (resolved), leaves doubt (unresolved), or was not checked (unaudited).',
});

export const ReferenceRef = builder.objectRef<ReferenceRow>('Reference').implement({
  description: 'A source, kept once and linked from every row it supports.',
  fields: (t) => ({
    id: t.exposeID('id'),
    kind: t.expose('kind', { type: ReferenceKindEnum }),
    title: t.exposeString('title'),
    ...Object.fromEntries(
      OPTIONAL_FIELDS.map((field) => [
        field,
        t.expose(field, {
          type: DAY_FIELDS.has(field) ? 'LocalDate' : 'String',
          nullable: true,
          description: DESCRIPTION_OF[field],
        }),
      ]),
    ),
    citation: t.string({
      description:
        'Chicago bibliography form, rendered on the server, plain; a surface that shows italics renders the parts itself.',
      resolve: (row) => citationText(row),
    }),
    isGlobal: t.boolean({ resolve: (row) => row.workspaceId === null }),
    scholarly: t.exposeBoolean('scholarly', {
      description:
        "A peer-reviewed journal or a university or academic press. Only a compendium source is marked; a coven's is always false.",
    }),
    audit: t.field({ type: AuditInfo, resolve: (row) => row }),
  }),
});

/** One row's link to a source: the locator is the link's, not the reference's. */
export const ReferenceLinkRef = builder.objectRef<CitedReference>('ReferenceLink').implement({
  description: "One row's link to a source.",
  fields: (t) => ({
    reference: t.field({ type: ReferenceRef, resolve: (link) => link.reference }),
    locator: t.exposeString('locator', {
      nullable: true,
      description: 'Where in the source: "p. 112", "chap. 13".',
    }),
    nameBasis: t.expose('nameBasis', {
      type: NameBasisEnum,
      nullable: true,
      description: "A compendium citation's; null on a coven's, or when nobody recorded it.",
    }),
    supports: t.exposeStringList('supports', {
      nullable: true,
      description:
        "The fields of the cited entry or form this source backs, by name. A compendium citation's; null on a coven's, or when nobody recorded them.",
    }),
  }),
});

/** A reference an ingredient cites: an existing reference's id, an optional locator, and on the compendium tier the two attributes. */
export const ReferenceLinkInput = builder.inputType('ReferenceLinkInput', {
  fields: (t) => ({
    referenceId: t.id({ required: true }),
    locator: t.string(),
    nameBasis: t.field({
      type: NameBasisEnum,
      description: "The compendium's alone: refused on a coven's citation.",
    }),
    supports: t.stringList({
      description:
        "The fields of the entry, or of the form, this source backs. The compendium's alone: refused on a coven's citation.",
    }),
  }),
});

/** A reference's fields, validated per `kind` by the shared schema. One input for both writes: an update replaces the reference, so a field left out is cleared. */
const ReferenceInput = builder.inputType('ReferenceInput', {
  description: 'A reference, whole. On an update, a field left out or null is cleared.',
  fields: (t) => ({
    kind: t.field({ type: ReferenceKindEnum, required: true }),
    title: t.string({ required: true }),
    scholarly: t.boolean({
      description:
        "A peer-reviewed journal or a university or academic press; left out is false. Refused on a coven's source.",
    }),
    // Typed back from the list: `Object.fromEntries` answers string keys.
    ...(Object.fromEntries(
      OPTIONAL_FIELDS.map((field) => [
        field,
        DAY_FIELDS.has(field) ? t.field({ type: 'LocalDate' }) : t.string(),
      ]),
    ) as {
      [Field in (typeof OPTIONAL_FIELDS)[number]]: InputFieldRef<
        BuilderTypes,
        CitationFields[Field]
      >;
    }),
  }),
});

/** The tier the `workspaceId` argument names, as a scope: null writes the compendium's (site admin only), a coven's admits anyone signed in. */
const tierScope = (_root: unknown, { workspaceId }: { workspaceId?: string | null }) =>
  workspaceId == null ? { curator: true } : { signedIn: true };

builder.mutationField('createReference', (t) =>
  t.field({
    type: ReferenceRef,
    description: "A null workspaceId writes the compendium's, under the admin proof.",
    args: {
      workspaceId: t.arg.id({ required: false }),
      input: t.arg({ type: ReferenceInput, required: true }),
    },
    authScopes: tierScope,
    resolve: (_root, { workspaceId, input }, context) =>
      createReference(sessionOf(context), workspaceId, input),
  }),
);

builder.mutationField('updateReference', (t) =>
  t.field({
    type: ReferenceRef,
    description: 'Reaches every row citing it; nothing deletes a reference in v1.',
    args: {
      workspaceId: t.arg.id({ required: false }),
      id: t.arg.id({ required: true }),
      input: t.arg({ type: ReferenceInput, required: true }),
    },
    authScopes: tierScope,
    resolve: async (_root, { workspaceId, id, input }, { loaders, ...context }) => {
      const row = await updateReference(sessionOf(context), workspaceId, id, input);
      // An earlier root field of this request may have read a citation of it.
      loaders.referencesByIngredient.clearAll();
      return row;
    },
  }),
);

// One source whole, for the edit panel to open on. Signed-in
// whatever the tier, as the picker it is opened from is; one row, so no page.
builder.queryField('reference', (t) =>
  t.field({
    type: ReferenceRef,
    description:
      "A null workspaceId reads the compendium's alone; a coven's reads its own or the compendium's, never another coven's.",
    args: {
      id: t.arg.id({ required: true }),
      workspaceId: t.arg.id({ required: false }),
    },
    resolve: (_root, { id, workspaceId }, context) =>
      getReference(sessionOf(context), workspaceId, id),
  }),
);

// The reference picker's search.
suggestionConnection('referenceSuggestions', ReferenceRef, suggestReferences);
