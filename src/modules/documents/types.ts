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
