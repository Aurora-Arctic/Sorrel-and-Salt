import type { ReactNode } from 'react';

export type DocumentPlaceholders = Readonly<Record<string, ReactNode>>;

export interface DocumentHistoryEntry {
  number: number;
  publishedAt: Date;
  href: string;
}

export interface DocumentPageProps {
  title: string;
  lede?: string;
  number?: number;
  /** When the text last changed; a page that gives none draws no "last updated" line. */
  updatedOn?: Date;
  body: string;
  history?: DocumentHistoryEntry[];
  placeholders?: DocumentPlaceholders;
  /** The keeper editor for this document, drawn as an Edit link beside the heading; only a keeper is given it. */
  editHref?: string;
  /** Typography of one document's own; only the About Us page asks for it. */
  variant?: 'about';
}
