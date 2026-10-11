import type { Route } from 'next';
import type { ReactNode } from 'react';
import type { EditedGroupedValue } from '../../components/GroupedValueForm/types';

/** A flat vocabulary, as the astrology services name it. */
export type FlatVocabulary = 'planets' | 'zodiacSigns';

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
  value?: EditedGroupedValue;
}

/**
 * A list page's address as Next hands it over (MB.115, `list-page.ts`): any
 * parameter may come once, several times, or not at all. Each page's own
 * filter parameters sit beside these.
 */
export interface ListSearchParams {
  query?: string | string[];
  after?: string | string[];
  before?: string | string[];
  new?: string | string[];
  edit?: string | string[];
}

/** Where on a list page the address puts the admin, as `readListPlace` reads it. */
export interface ListPlace {
  /** The name filter, trimmed; `''` for none, as a native submit's blank `query=` is. */
  query: string;
  /** At most one cursor: `before` is dropped when `after` is given. Unreadable is none. */
  after: string | undefined;
  before: string | undefined;
  /** The slug `?edit=` names, if any. */
  editSlug: string | undefined;
  /** Whether `?new` is present, by presence alone. */
  adding: boolean;
}

/** One cursor, for the page before or the page after. */
export type PagerCursor = { after: string } | { before: string };

/** The pager's two ends; an end with no page is left out. */
export interface PagerHrefs {
  previousHref: Route | undefined;
  nextHref: Route | undefined;
}

export interface MissingNoticeProps {
  /** The row the page lists, singular and lower case: "category", "compendium entry". */
  noun: string;
}
