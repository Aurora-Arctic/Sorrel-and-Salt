export type DocumentKey = 'privacy' | 'disclaimer' | 'code-of-ethics' | 'terms';

/** A published version of a document, with the document's own title and lede. */
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

/** A document's open draft, with the revision an editor must send back to write into it. */
export type DocumentDraft = {
  id: string;
  number: number;
  body: string;
  revision: number;
};

/** A version that is public. */
export type PublishedDocumentVersion = {
  number: number;
  body: string;
  publishedAt: Date;
};

/** What the admin editor opens on: the document, its public version and the draft beside it. */
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

/** A document a mailing covers, at the version it tells every account about. */
export type DocumentMailingDocument = { key: string; title: string; versionNumber: number };

/** One mailing, with the documents it covers and how many accounts its mail has reached. */
export type DocumentMailingSummary = {
  id: string;
  documents: DocumentMailingDocument[];
  state: DocumentMailingState;
  reached: number;
  recipientCount: number;
  startedAt: Date;
  finishedAt: Date | null;
};

/** A document whose newest published version past the first no sent mailing has covered. */
export type PendingDocument = {
  documentId: string;
  versionId: string;
  key: string;
  title: string;
  versionNumber: number;
  /** A sending or paused mailing already covers this version. */
  inMailing: boolean;
};

/** What the mailing page shows: what is pending, what a mailing would take, and the mailings that matter. */
export type DocumentMailingOverview = {
  pending: PendingDocument[];
  /** How many accounts a mailing would reach now. */
  accountCount: number;
  /** How many days a mailing to them takes at the daily cap. */
  days: number;
  /** Some pending version is in no sending or paused mailing, so a keeper may start one. */
  canSend: boolean;
  /** The sending and paused mailings, oldest first. */
  open: DocumentMailingSummary[];
  /** The newest mailing that reached every recipient, or null before any has. */
  lastSent: DocumentMailingSummary | null;
};

/** Bound to the request that starts a mailing: its run carries the origin on, so the mailed links point at this site. */
export interface DocumentMailingNotifier {
  /** The origin a mailed link is built on. @throws {Error} where none resolves. */
  origin(): Promise<string>;
}
