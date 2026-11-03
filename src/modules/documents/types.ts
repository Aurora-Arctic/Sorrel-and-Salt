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
 * today's is used, `paused` by the provider's monthly quota until an admin resumes it, `sent`, or `replaced` by a newer mailing.
 */
export type DocumentMailingState = 'queued' | 'sending' | 'waiting' | 'paused' | 'sent' | 'replaced';

/** One mailing of a version, with how many accounts its mail has reached. */
export type DocumentMailingSummary = {
  id: string;
  versionNumber: number;
  state: DocumentMailingState;
  reached: number;
  recipientCount: number;
  startedAt: Date;
  finishedAt: Date | null;
};

/** What the editor's mailing panel shows: the published version, what a mailing would take, and the mailings that matter. */
export type DocumentMailingOverview = {
  versionNumber: number;
  /** How many accounts a mailing would reach now. */
  accountCount: number;
  /** How many days a mailing to them takes at the daily cap. */
  days: number;
  /** The mailing of the published version, or null before one is started. */
  current: DocumentMailingSummary | null;
  /** A mailing of an earlier version still sending or paused, which a new mailing would replace. */
  inProgress: DocumentMailingSummary | null;
};

/** Bound to the request that starts a mailing: its run carries the origin on, so the mailed links point at this site. */
export interface DocumentMailingNotifier {
  /** The origin a mailed link is built on. @throws {Error} where none resolves. */
  origin(): Promise<string>;
}
