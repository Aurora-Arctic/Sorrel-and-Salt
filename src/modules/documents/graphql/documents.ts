import { builder } from '../../../graphql/builder';
import { sessionOf } from '../../../graphql/context-helpers';
import {
  discardDocumentDraft,
  publishDocumentDraft,
  readDocumentForEditing,
  saveDocumentDraft,
  updateDocument,
} from '../services/editing';
import {
  emailDocumentsToEveryAccount,
  readDocumentMailings,
  resumeDocumentMailing,
} from '../services/document-mailing';
import type {
  DocumentDraft,
  DocumentForEditing,
  DocumentMailingOverview,
  DocumentMailingDocument,
  DocumentMailingSummary,
  PendingDocument,
  PublishedDocumentVersion,
} from '../types';

const DocumentVersionRef = builder
  .objectRef<PublishedDocumentVersion>('DocumentVersion')
  .implement({
    description: 'A published version of a document.',
    fields: (t) => ({
      number: t.exposeInt('number'),
      body: t.exposeString('body'),
      publishedAt: t.expose('publishedAt', { type: 'DateTime' }),
    }),
  });

const DocumentDraftRef = builder.objectRef<DocumentDraft>('DocumentDraft').implement({
  description: 'The open draft of a document. `revision` is what a save or publish sends back.',
  fields: (t) => ({
    id: t.exposeID('id'),
    number: t.exposeInt('number'),
    body: t.exposeString('body'),
    revision: t.exposeInt('revision'),
  }),
});

const DocumentForEditingRef = builder
  .objectRef<DocumentForEditing>('DocumentForEditing')
  .implement({
    description: 'A document as the admin editor opens it: its public version and its draft.',
    fields: (t) => ({
      id: t.exposeID('id'),
      key: t.exposeString('key'),
      title: t.exposeString('title'),
      lede: t.exposeString('lede'),
      published: t.field({
        type: DocumentVersionRef,
        nullable: true,
        resolve: (document) => document.published,
      }),
      draft: t.field({
        type: DocumentDraftRef,
        nullable: true,
        resolve: (document) => document.draft,
      }),
    }),
  });

const DocumentRef = builder
  .objectRef<{ id: string; title: string; lede: string }>('Document')
  .implement({
    description: 'A site document’s title and lede.',
    fields: (t) => ({
      id: t.exposeID('id'),
      title: t.exposeString('title'),
      lede: t.exposeString('lede'),
    }),
  });

const DocumentInputRef = builder.inputType('DocumentInput', {
  fields: (t) => ({
    title: t.string({ required: true }),
    lede: t.string({ required: true }),
  }),
});

builder.queryField('documentForEditing', (t) =>
  t.field({
    type: DocumentForEditingRef,
    args: { key: t.arg.string({ required: true }) },
    authScopes: { admin: true },
    resolve: (_root, { key }, context) => readDocumentForEditing(sessionOf(context), key),
  }),
);

// A null `expectedRevision` opens a draft; a number writes into the open one only while it is still at that revision.
builder.mutationField('saveDocumentDraft', (t) =>
  t.field({
    type: DocumentDraftRef,
    args: {
      documentId: t.arg.id({ required: true }),
      body: t.arg.string({ required: true }),
      expectedRevision: t.arg.int(),
    },
    authScopes: { admin: true },
    resolve: (_root, { documentId, body, expectedRevision }, context) =>
      saveDocumentDraft(sessionOf(context), documentId, {
        body,
        expectedRevision: expectedRevision ?? null,
      }),
  }),
);

builder.mutationField('publishDocumentDraft', (t) =>
  t.field({
    type: DocumentVersionRef,
    args: { documentId: t.arg.id({ required: true }), expectedRevision: t.arg.int() },
    authScopes: { admin: true },
    resolve: (_root, { documentId, expectedRevision }, context) =>
      publishDocumentDraft(sessionOf(context), documentId, {
        expectedRevision: expectedRevision ?? null,
      }),
  }),
);

builder.mutationField('discardDocumentDraft', (t) =>
  t.field({
    type: 'ID',
    description:
      "Throws the document's open draft away, answering its id. Refused as STALE_WRITE when the draft has moved on from `expectedRevision`.",
    args: {
      documentId: t.arg.id({ required: true }),
      expectedRevision: t.arg.int({ required: true }),
    },
    authScopes: { admin: true },
    resolve: (_root, { documentId, expectedRevision }, context) =>
      discardDocumentDraft(sessionOf(context), documentId, { expectedRevision }),
  }),
);

builder.mutationField('updateDocument', (t) =>
  t.field({
    type: DocumentRef,
    args: {
      id: t.arg.id({ required: true }),
      input: t.arg({ type: DocumentInputRef, required: true }),
    },
    authScopes: { admin: true },
    resolve: (_root, { id, input }, context) => updateDocument(sessionOf(context), id, input),
  }),
);

const DocumentMailingDocumentRef = builder
  .objectRef<DocumentMailingDocument>('DocumentMailingDocument')
  .implement({
    description: 'A document a mailing covers, at the version it tells every account about.',
    fields: (t) => ({
      key: t.exposeString('key'),
      title: t.exposeString('title'),
      versionNumber: t.exposeInt('versionNumber'),
    }),
  });

const DocumentMailingRef = builder.objectRef<DocumentMailingSummary>('DocumentMailing').implement({
  description:
    'One mailing to every account, of every document it covers. `state` is queued, sending, waiting, paused, sent or replaced.',
  fields: (t) => ({
    id: t.exposeID('id'),
    // Bounded by the four site documents.
    documents: t.field({
      type: [DocumentMailingDocumentRef],
      resolve: (mailing) => mailing.documents,
    }),
    state: t.exposeString('state'),
    reached: t.exposeInt('reached'),
    recipientCount: t.exposeInt('recipientCount'),
    startedAt: t.expose('startedAt', { type: 'DateTime' }),
    finishedAt: t.expose('finishedAt', { type: 'DateTime', nullable: true }),
  }),
});

const PendingDocumentRef = builder.objectRef<PendingDocument>('PendingDocument').implement({
  description:
    'A document whose newest published version past the first no sent mailing has covered. `inMailing` says a sending or paused mailing covers it.',
  fields: (t) => ({
    documentId: t.exposeID('documentId'),
    versionId: t.exposeID('versionId'),
    key: t.exposeString('key'),
    title: t.exposeString('title'),
    versionNumber: t.exposeInt('versionNumber'),
    inMailing: t.exposeBoolean('inMailing'),
  }),
});

const DocumentMailingOverviewRef = builder
  .objectRef<DocumentMailingOverview>('DocumentMailingOverview')
  .implement({
    description:
      'What the mailing page needs: the documents changed since the last email, whom a mailing would reach and in how many days, and the mailings that matter.',
    fields: (t) => ({
      // Bounded by the four site documents.
      pending: t.field({ type: [PendingDocumentRef], resolve: (overview) => overview.pending }),
      accountCount: t.exposeInt('accountCount'),
      days: t.exposeInt('days'),
      canSend: t.exposeBoolean('canSend'),
      // A new mailing replaces every open one, so this holds one mailing, or a few left from before joint mailings.
      open: t.field({ type: [DocumentMailingRef], resolve: (overview) => overview.open }),
      lastSent: t.field({
        type: DocumentMailingRef,
        nullable: true,
        resolve: (overview) => overview.lastSent,
      }),
    }),
  });

const DocumentMailingSummaryInputRef = builder.inputType('DocumentMailingSummaryInput', {
  description: 'What changed in one pending document, in the keeper’s words.',
  fields: (t) => ({
    versionId: t.id({ required: true }),
    summary: t.string({ required: true }),
  }),
});

builder.queryField('documentMailings', (t) =>
  t.field({
    type: DocumentMailingOverviewRef,
    authScopes: { admin: true },
    resolve: (_root, _args, context) => readDocumentMailings(sessionOf(context)),
  }),
);

builder.mutationField('emailDocumentsToEveryAccount', (t) =>
  t.field({
    type: DocumentMailingOverviewRef,
    args: {
      summaries: t.arg({ type: [DocumentMailingSummaryInputRef], required: true }),
    },
    authScopes: { admin: true },
    resolve: (_root, { summaries }, context) =>
      emailDocumentsToEveryAccount(
        sessionOf(context),
        {
          summaries: summaries.map(({ versionId, summary }) => ({
            versionId: String(versionId),
            summary,
          })),
        },
        context.documents,
      ),
  }),
);

builder.mutationField('resumeDocumentMailing', (t) =>
  t.field({
    type: DocumentMailingOverviewRef,
    args: { mailingId: t.arg.id({ required: true }) },
    authScopes: { admin: true },
    resolve: (_root, { mailingId }, context) =>
      resumeDocumentMailing(sessionOf(context), mailingId, context.documents),
  }),
);
