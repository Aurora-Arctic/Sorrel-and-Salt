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
  updatedOn: Date;
  body: string;
  history?: DocumentHistoryEntry[];
  placeholders?: DocumentPlaceholders;
}
