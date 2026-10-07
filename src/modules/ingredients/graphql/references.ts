import { builder } from '../../../graphql/builder';
import { AuditInfo } from '../../../graphql/schema/audit';
import { citationText } from '../../../lib/citation';
import { Forbidden } from '../../../lib/errors';
import { REFERENCE_KINDS } from '../schema/ingredient-enums';
import { createReference, suggestReferences, updateReference } from '../services/references';
import type { CitedReference, ReferenceRow } from '../types';

// A reference as DESIGN.md §7 sketches it (MB.151, built by MB.153): its
// fields, the tier as `isGlobal`, and the citation rendered on the server by
// the one renderer, plain. Its two writes and the picker's search are here;
// `Ingredient.references` reads through the request's loader in
// `ingredient.ts`. `workspaceId` stays off the wire, as it does on `Ingredient`.

export const ReferenceKindEnum = builder.enumType('ReferenceKind', { values: REFERENCE_KINDS });

export const ReferenceRef = builder.objectRef<ReferenceRow>('Reference').implement({
  description: 'A source, kept once and linked from every row it supports.',
  fields: (t) => ({
    id: t.exposeID('id'),
    kind: t.expose('kind', { type: ReferenceKindEnum }),
    authors: t.exposeString('authors', { nullable: true }),
    title: t.exposeString('title'),
    container: t.exposeString('container', {
      nullable: true,
      description:
        "The book of a chapter, the journal of an article, the reference work of an entry, or a web page's site.",
    }),
    contributors: t.exposeString('contributors', { nullable: true }),
    edition: t.exposeString('edition', { nullable: true }),
    volume: t.exposeString('volume', { nullable: true }),
    issue: t.exposeString('issue', { nullable: true }),
    series: t.exposeString('series', { nullable: true }),
    place: t.exposeString('place', { nullable: true }),
    publisher: t.exposeString('publisher', { nullable: true }),
    published: t.exposeString('published', { nullable: true }),
    pages: t.exposeString('pages', { nullable: true }),
    host: t.exposeString('host', {
      nullable: true,
      description: 'The repository a print work was read through.',
    }),
    url: t.exposeString('url', { nullable: true }),
    modified: t.expose('modified', { type: 'LocalDate', nullable: true }),
    accessed: t.expose('accessed', { type: 'LocalDate', nullable: true }),
    note: t.exposeString('note', { nullable: true }),
    citation: t.string({
      description:
        'Chicago bibliography form, rendered on the server, plain; a surface that shows italics renders the parts itself.',
      resolve: (row) => citationText(row),
    }),
    isGlobal: t.boolean({ resolve: (row) => row.workspaceId === null }),
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
  }),
});

/** A reference an ingredient cites: an existing reference's id, and an optional locator. */
export const ReferenceLinkInput = builder.inputType('ReferenceLinkInput', {
  fields: (t) => ({
    referenceId: t.id({ required: true }),
    locator: t.string(),
  }),
});

/**
 * A reference's fields, validated per `kind` by the shared schema. One input
 * for both writes: an update replaces the reference, so a field left out or
 * null is cleared — a day has no empty value to send.
 */
const ReferenceInput = builder.inputType('ReferenceInput', {
  description: 'A reference, whole. On an update, a field left out or null is cleared.',
  fields: (t) => ({
    kind: t.field({ type: ReferenceKindEnum, required: true }),
    title: t.string({ required: true }),
    authors: t.string(),
    container: t.string(),
    contributors: t.string(),
    edition: t.string(),
    volume: t.string(),
    issue: t.string(),
    series: t.string(),
    place: t.string(),
    publisher: t.string(),
    published: t.string(),
    pages: t.string(),
    host: t.string(),
    url: t.string(),
    modified: t.field({ type: 'LocalDate' }),
    accessed: t.field({ type: 'LocalDate' }),
    note: t.string(),
  }),
});

builder.mutationField('createReference', (t) =>
  t.field({
    type: ReferenceRef,
    description: "A null workspaceId writes the compendium's, under the admin proof.",
    args: {
      workspaceId: t.arg.id({ required: false }),
      input: t.arg({ type: ReferenceInput, required: true }),
    },
    authScopes: { signedIn: true },
    resolve: (_root, { workspaceId, input }, { session }) => {
      if (!session) throw new Forbidden();
      return createReference(session, workspaceId, input);
    },
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
    authScopes: { signedIn: true },
    resolve: async (_root, { workspaceId, id, input }, { session, loaders }) => {
      if (!session) throw new Forbidden();
      const row = await updateReference(session, workspaceId, id, input);
      // An earlier root field of this request may have read a citation of it.
      loaders.referencesByIngredient.clearAll();
      return row;
    },
  }),
);

// The reference picker's search (MB.154 reads it). The resolver refuses only
// a missing session; which covens a caller may ask about is the service's
// check, as `ingredientSuggestions`' is.
builder.queryField('referenceSuggestions', (t) =>
  t.pagedConnection({
    type: ReferenceRef,
    args: {
      // Null reads the compendium alone: the admin's compendium form names no coven (M5.5).
      workspaceId: t.arg.id({ required: false }),
      query: t.arg.string({ required: false }),
    },
    resolve: (_root, { workspaceId, query }, page, { session }) => {
      if (!session) throw new Forbidden();
      return suggestReferences(session, workspaceId, query ?? '', page);
    },
  }),
);
