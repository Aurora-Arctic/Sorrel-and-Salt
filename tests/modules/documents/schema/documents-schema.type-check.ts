import { eq } from 'drizzle-orm';
import type { AuditWriter } from '@/db/repository';
import type { NamedWrites } from '@/db/types';
import { documents } from '@/modules/documents/schema/documents';
import { documentVersions } from '@/modules/documents/schema/document-versions';
import { documentMailings } from '@/modules/documents/schema/document-mailings';
import { documentMailingRecipients } from '@/modules/documents/schema/document-mailing-recipients';

// Compile assertions, checked by `npm run typecheck` and run by nothing: each `@ts-expect-error` fails the typecheck the moment
// its constraint is loosened, which a runtime assertion cannot see. `tsconfig.json` includes `tests/`, which is what reads this.

// The mark itself, as a type: a table that lost it fails its assignment.
export const marked: NamedWrites[] = [
  documents,
  documentVersions,
  documentMailings,
  documentMailingRecipients,
];

const id = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const ofMailing = eq(documentMailingRecipients.mailingId, id);

// A published version is never edited, so `document_versions` takes its writes from the draft methods alone.
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

// A document's key is seeded and its versions hang off it, so only its title and lede change, by `updateDocument`.
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

// A mailing's progress is its own methods' to stamp, so a retried batch mails no one twice.
export const mailingWrites = [
  (write: AuditWriter) =>
    // @ts-expect-error — the mark: no generic insert, so a mailing cannot go in already sent.
    write.insert(documentMailings, {
      documentVersionId: id,
      summary: '',
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
];
