import { builder } from '../../../graphql/builder';
import { sessionOf } from '../../../graphql/context-helpers';
import {
  createHelpArticle,
  deleteHelpArticle,
  setHelpArticleShown,
  updateHelpArticle,
} from '../services/help-writes';
import {
  listKeeperHelpArticles,
  listStaffHelpArticles,
  readHelpArticle,
  readHelpArticleIndex,
  readHelpFaq,
  readHelpGlossary,
  readStaffHelpArticle,
  searchHelp,
} from '../services/help-reads';
import type { HelpArticle } from '../types';

const HelpArticleKindEnum = builder.enumType('HelpArticleKind', {
  description: 'A question and answer, a guide, or a glossary term.',
  values: ['faq', 'article', 'term'] as const,
});

const HelpAudienceEnum = builder.enumType('HelpAudience', {
  description:
    'Who reads a help row: everyone (`public`), curators and keepers (`staff`), or keepers alone (`keeper`).',
  values: ['public', 'staff', 'keeper'] as const,
});

const HelpListingEnum = builder.enumType('HelpListing', {
  description: 'Which rows the keeper’s list holds: the shown ones, the hidden ones, or both.',
  values: ['shown', 'hidden', 'all'] as const,
});

const HelpArticleRef = builder.objectRef<HelpArticle>('HelpArticle');

HelpArticleRef.implement({
  description: 'A help row: an FAQ entry, an article or a glossary term.',
  fields: (t) => ({
    id: t.exposeID('id'),
    kind: t.field({ type: HelpArticleKindEnum, resolve: (article) => article.kind }),
    audience: t.field({ type: HelpAudienceEnum, resolve: (article) => article.audience }),
    title: t.exposeString('title'),
    slug: t.exposeString('slug'),
    summary: t.exposeString('summary', { nullable: true }),
    body: t.exposeString('body'),
    position: t.exposeInt('position', { nullable: true }),
    parentId: t.exposeID('parentId', { nullable: true }),
    shown: t.exposeBoolean('shown', {
      description: 'Whether readers see the row; a hidden parent hides its children too.',
    }),
    // Bounded: help nests one level, beneath an article a keeper writes by hand.
    children: t.field({
      type: [HelpArticleRef],
      description: 'The live children the reader’s audience reaches, in position order.',
      resolve: (article, _args, context) => context.loaders.helpChildrenByParent.load(article.id),
    }),
  }),
});

const HelpArticleInputRef = builder.inputType('HelpArticleInput', {
  fields: (t) => ({
    kind: t.field({ type: HelpArticleKindEnum, required: true }),
    title: t.string({ required: true }),
    body: t.string({ required: true }),
    audience: t.field({ type: HelpAudienceEnum }),
    summary: t.string(),
    position: t.int({ description: 'A whole number, 0 or more.' }),
    parentId: t.id(),
    childIds: t.idList({
      description: 'The articles this one holds, in order, each placed by its place in the list.',
    }),
  }),
});

const HelpArticlePatchRef = builder.inputType('HelpArticlePatch', {
  description:
    'Fields to change; one left out stays. A null `summary`, `position` or `parentId` clears it. A new title moves the slug, which is always derived from the title. A `childIds` list sets the children in its order and releases a child it leaves out to the top level.',
  fields: (t) => ({
    title: t.string(),
    body: t.string(),
    audience: t.field({ type: HelpAudienceEnum }),
    summary: t.string(),
    position: t.int({ description: 'A whole number, 0 or more.' }),
    parentId: t.id(),
    childIds: t.idList(),
  }),
});

// The public reads take no scope: a signed-out reader is answered the public rows alone.
builder.queryField('helpFaq', (t) =>
  t.pagedConnection({
    type: HelpArticleRef,
    description: 'The public FAQ entries, in position order.',
    resolve: (_query, _args, page) => readHelpFaq(page),
  }),
);

builder.queryField('helpArticles', (t) =>
  t.pagedConnection({
    type: HelpArticleRef,
    description: 'The public top-level articles, in position order.',
    resolve: (_query, _args, page) => readHelpArticleIndex(page),
  }),
);

builder.queryField('helpGlossary', (t) =>
  t.pagedConnection({
    type: HelpArticleRef,
    description: 'The public glossary terms, A to Z.',
    resolve: (_query, _args, page) => readHelpGlossary(page),
  }),
);

builder.queryField('helpSearch', (t) =>
  t.pagedConnection({
    type: HelpArticleRef,
    description:
      'The rows the reader’s audience reaches that `query` finds, best first; a blank query finds none.',
    args: { query: t.arg.string({ required: true }) },
    resolve: (_query, { query }, page, context) => searchHelp(context.session ?? null, query, page),
  }),
);

builder.queryField('helpArticle', (t) =>
  t.field({
    type: HelpArticleRef,
    description: 'A public row by slug; not found for any other audience.',
    args: { slug: t.arg.string({ required: true }) },
    resolve: (_root, { slug }) => readHelpArticle(slug),
  }),
);

// The staff reads carry no scope: the service refuses a reader who is neither a curator nor a keeper.
builder.queryField('staffHelpArticle', (t) =>
  t.field({
    type: HelpArticleRef,
    description: 'A row by slug among the audiences a curator or keeper reaches.',
    args: { slug: t.arg.string({ required: true }) },
    resolve: (_root, { slug }, context) => readStaffHelpArticle(sessionOf(context), slug),
  }),
);

builder.queryField('staffHelpArticles', (t) =>
  t.pagedConnection({
    type: HelpArticleRef,
    description: 'Every live row of every kind the reader’s audience reaches, A to Z.',
    resolve: (_query, _args, page, context) => listStaffHelpArticles(sessionOf(context), page),
  }),
);

builder.queryField('keeperHelpArticles', (t) =>
  t.pagedConnection({
    type: HelpArticleRef,
    description:
      'Every live row of every kind and audience, shown and hidden, that the filters admit, A to Z: the keeper’s list.',
    args: {
      listing: t.arg({ type: HelpListingEnum }),
      query: t.arg.string(),
      kind: t.arg({ type: HelpArticleKindEnum }),
      audience: t.arg({ type: HelpAudienceEnum }),
    },
    authScopes: { admin: true },
    resolve: (_query, { listing, query, kind, audience }, page, context) =>
      listKeeperHelpArticles(sessionOf(context), { listing, query, kind, audience }, page),
  }),
);

builder.mutationField('createHelpArticle', (t) =>
  t.field({
    type: HelpArticleRef,
    args: { input: t.arg({ type: HelpArticleInputRef, required: true }) },
    authScopes: { admin: true },
    resolve: (_root, { input }, context) => createHelpArticle(sessionOf(context), input),
  }),
);

builder.mutationField('updateHelpArticle', (t) =>
  t.field({
    type: HelpArticleRef,
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: HelpArticlePatchRef, required: true }),
    },
    authScopes: { admin: true },
    resolve: (_root, { id, input }, context) => updateHelpArticle(sessionOf(context), id, input),
  }),
);

builder.mutationField('deleteHelpArticle', (t) =>
  t.field({
    type: 'ID',
    description: 'A soft delete, answering the id; refused while the row holds live children.',
    args: { id: t.arg.id({ required: true }) },
    authScopes: { admin: true },
    resolve: (_root, { id }, context) => deleteHelpArticle(sessionOf(context), id),
  }),
);

builder.mutationField('setHelpArticleShown', (t) =>
  t.field({
    type: HelpArticleRef,
    description:
      'Shows or hides a row; a hidden row reaches no reader, and a hidden parent hides its children.',
    args: { id: t.arg.id({ required: true }), shown: t.arg.boolean({ required: true }) },
    authScopes: { admin: true },
    resolve: (_root, { id, shown }, context) => setHelpArticleShown(sessionOf(context), id, shown),
  }),
);
