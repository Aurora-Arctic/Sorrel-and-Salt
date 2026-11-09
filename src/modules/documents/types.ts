export type DocumentKey = 'privacy' | 'about' | 'disclaimer' | 'code-of-ethics' | 'terms';

export type PublishedDocument = {
  key: string;
  title: string;
  lede: string;
  number: number;
  body: string;
  publishedAt: Date;
};

export type DocumentVersionSummary = {
  number: number;
  publishedAt: Date;
};

export type DocumentDraft = {
  id: string;
  number: number;
  body: string;
  revision: number;
};

export type PublishedDocumentVersion = {
  number: number;
  body: string;
  publishedAt: Date;
};

export type DocumentForEditing = {
  id: string;
  key: string;
  title: string;
  lede: string;
  published: PublishedDocumentVersion | null;
  draft: DocumentDraft | null;
};

/**
 * Where a mailing stands: `queued` behind an older mailing of another document, `sending`, `waiting` for tomorrow's allowance once
 * today's is used, `paused` by the provider's monthly quota until a keeper resumes it, `sent`, or `replaced` by a newer mailing.
 */
export type DocumentMailingState =
  'queued' | 'sending' | 'waiting' | 'paused' | 'sent' | 'replaced';

export type DocumentMailingDocument = { key: string; title: string; versionNumber: number };

export type DocumentMailingSummary = {
  id: string;
  documents: DocumentMailingDocument[];
  state: DocumentMailingState;
  reached: number;
  recipientCount: number;
  startedAt: Date;
  finishedAt: Date | null;
};

export type PendingDocument = {
  documentId: string;
  versionId: string;
  key: string;
  title: string;
  versionNumber: number;
  /** A sending or paused mailing already covers this version. */
  inMailing: boolean;
};

export type DocumentMailingOverview = {
  pending: PendingDocument[];
  accountCount: number;
  days: number;
  /** Some pending version is in no sending or paused mailing, so a keeper may start one. */
  canSend: boolean;
  open: DocumentMailingSummary[];
  lastSent: DocumentMailingSummary | null;
};

export interface DocumentMailingNotifier {
  /** @throws {Error} where none resolves. */
  origin(): Promise<string>;
}
