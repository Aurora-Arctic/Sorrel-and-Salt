import { eq } from 'drizzle-orm';
import type { AuditWriter } from '@/db/repository';
import type { NamedWrites } from '@/db/types';
import { documents } from '@/modules/documents/schema/documents';
import { documentVersions } from '@/modules/documents/schema/document-versions';
import { documentMailings } from '@/modules/documents/schema/document-mailings';
import { documentMailingRecipients } from '@/modules/documents/schema/document-mailing-recipients';
import { documentMailingItems } from '@/modules/documents/schema/document-mailing-items';

// Run by `npm run typecheck` only: each @ts-expect-error fails it the moment its constraint is loosened.

export const marked: NamedWrites[] = [
  documents,
  documentVersions,
  documentMailings,
  documentMailingRecipients,
  documentMailingItems,
];

const id = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const ofMailing = eq(documentMailingRecipients.mailingId, id);

export const versionWrites = [
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no generic insert, so a version cannot go in published under a number of its choosing.
    write.insert(documentVersions, { documentId: id, number: 1, body: '', status: 'published' }),
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no generic update, so a published body cannot be rewritten.
    write.update(documentVersions, { body: '' }, eq(documentVersions.documentId, id)),
  (write: AuditWriter) =>
    // @ts-expect-error — nor by id.
    write.updateById(documentVersions, id, { body: '' }),
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no soft delete, so a cited version stays.
    write.softDelete(documentVersions, eq(documentVersions.documentId, id)),
  (write: AuditWriter) =>
    // @ts-expect-error — nor by id.
    write.softDeleteByIds(documentVersions, [id]),
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no hard delete.
    write.delete(documentVersions, eq(documentVersions.documentId, id)),
];

export const documentWrites = [
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no generic insert.
    write.insert(documents, { key: 'testdoc', title: 'Testwort', lede: 'Testwort.' }),
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no generic update, so the key cannot move.
    write.updateById(documents, id, { key: 'testdoc-moved' }),
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no soft delete.
    write.softDeleteByIds(documents, [id]),
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no hard delete.
    write.delete(documents, eq(documents.id, id)),
];

export const mailingWrites = [
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no generic insert, so a mailing cannot go in already sent.
    write.insert(documentMailings, {
      status: 'sent',
      recipientCount: 0,
    }),
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no generic update.
    write.updateById(documentMailings, id, { status: 'sending' }),
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no soft delete.
    write.softDeleteByIds(documentMailings, [id]),
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no generic insert, so an account cannot go in already sent.
    write.insert(documentMailingRecipients, { mailingId: id, userId: id, sentAt: new Date() }),
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no generic update, so a send time cannot be cleared.
    write.update(documentMailingRecipients, { sentAt: null }, ofMailing),
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no hard delete.
    write.delete(documentMailingRecipients, ofMailing),
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no generic insert, so a version cannot join a mailing already under way.
    write.insert(documentMailingItems, { mailingId: id, documentVersionId: id, summary: '' }),
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no generic update, so a summary cannot be rewritten after it is mailed.
    write.update(documentMailingItems, { summary: '' }, eq(documentMailingItems.mailingId, id)),
];
