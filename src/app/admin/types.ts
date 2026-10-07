import type { Route } from 'next';
import type { ReactNode } from 'react';
import type { EditedVocabularyValue } from '../../components/VocabularyValueForm/types';
import type { FlatVocabulary } from '../../components/VocabularyValueList/types';

export interface AdminLayoutProps {
  children: ReactNode;
}

/**
 * A flat vocabulary page's address (MB.95): the name query, at most one
 * cursor, and the modal open over it — `new` by presence, or `edit` by slug.
 */
export interface VocabularySearchParams {
  query?: string | string[];
  after?: string | string[];
  before?: string | string[];
  new?: string | string[];
  edit?: string | string[];
}

export interface AdminVocabularyPageProps {
  // A promise in Next 16 (node_modules/next/dist/docs/01-app/03-api-reference/
  // 03-file-conventions/page.md) — must be awaited before use.
  searchParams: Promise<VocabularySearchParams>;
}

export interface VocabularyDialogProps {
  vocabulary: FlatVocabulary;
  title: string;
  /** The page the modal opened over, which closing it returns to. */
  closeHref: Route;
  value?: EditedVocabularyValue;
}
