import type { ReactNode } from 'react';

/** What a page draws where the text holds a paragraph that is only `{name}`, by name. */
export type DocumentPlaceholders = Readonly<Record<string, ReactNode>>;

export interface DocumentHistoryEntry {
  /** The version's number. */
  number: number;
  /** The day the version was published. */
  publishedAt: Date;
  /** The address of the page that shows the version. */
  href: string;
}

export interface DocumentPageProps {
  /** The document's title: the page's one `h1`, title case. */
  title: string;
  /** A sentence under the title saying what the document is for. */
  lede?: string;
  /** The version's number, shown beside the date. */
  number?: number;
  /** The day the text was last changed, shown under the title as a dated `<time>`. */
  updatedOn: Date;
  /** The document's text in markdown: `##` and `###` headings, paragraphs, lists, tables and footnotes. */
  body: string;
  /** The earlier published versions, newest first, each linked beneath the text. */
  history?: DocumentHistoryEntry[];
  /** Parts of the page that depend on code, by the name the text gives them. A name the text uses and this omits prints as text. */
  placeholders?: DocumentPlaceholders;
}
