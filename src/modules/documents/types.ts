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
