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
  /** The day the text was last changed, shown under the title as a dated `<time>`. */
  updatedOn: Date;
  /** The document's text in markdown: `##` and `###` headings, paragraphs, lists, tables and footnotes. */
  body: string;
  /** The earlier published versions, newest first, each linked beneath the text. */
  history?: DocumentHistoryEntry[];
}
