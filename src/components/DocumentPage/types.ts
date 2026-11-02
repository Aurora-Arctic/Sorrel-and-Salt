import type { ReactNode } from 'react';

export interface DocumentPageProps {
  /** The document's title: the page's one `h1`, title case. */
  title: string;
  /** A sentence under the title saying what the document is for. */
  lede?: string;
  /** The day the text was last changed, shown under the title as a dated `<time>`. */
  updatedOn: Date;
  /** The document's sections: `h2` headings, paragraphs, lists and tables. */
  children: ReactNode;
}
