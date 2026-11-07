import type { Route } from 'next';
import type { ModalHeading } from '../Modal/types';

export interface HelpListEntry {
  id: string;
  title: string;
  kind: 'faq' | 'article' | 'term';
  audience: 'public' | 'staff' | 'keeper';
  position: number | null;
  editHref: Route;
  editHeading: ModalHeading;
}

export interface HelpListProps {
  articles: readonly HelpListEntry[];
  previousHref?: Route;
  nextHref?: Route;
}
