import type { ADMIN_PAGES } from '@/components/AdminNav/sections';
import type { Route } from 'next';
import type { ReactNode } from 'react';
import type { ModalHeading } from '@/components/Modal/types';

export interface AdminLayoutProps {
  children: ReactNode;
}

export interface TabbedLayoutProps extends AdminLayoutProps {
  action: ReactNode;
}

/** A list page's address as Next hands it over: each parameter may come once, many times or not at all. */
export interface ListSearchParams {
  query?: string | string[];
  after?: string | string[];
  before?: string | string[];
  new?: string | string[];
  edit?: string | string[];
}

export interface ListPlace {
  query: string;
  /** At most one cursor: `before` is dropped when `after` is given. Unreadable is none. */
  after: string | undefined;
  before: string | undefined;
  editSlug: string | undefined;
  adding: boolean;
}

export interface MissingNoticeProps {
  noun: string;
}

export type TabbedPageKey = Exclude<keyof typeof ADMIN_PAGES, 'compendium'>;

export interface AddActionProps {
  href: Route;
  /** The head of the modal it opens, "Add Category", shown at once while the form loads; left out, the Add opens a full page. */
  heading?: ModalHeading;
  /** True when the dialog draws its form from the address in the browser: a press uses `pushState`. */
  drawnHere?: boolean;
  /** The label, "Add Category": the link's name at every width, and the tip over the plus at a phone's. */
  children: string;
}

export interface AdminAreaLayoutProps extends AdminLayoutProps {
  /** The area's name, which is also its home link's text. */
  name: string;
  /** The area's home page. */
  href: Route;
  nav: ReactNode;
}

export interface DialogAddActionProps {
  /** The `?new=` value that opens the dialog, from the page's path. */
  value: (path: string) => string;
  label: string;
  heading?: ModalHeading;
  /** Other parameters the press drops from the address. */
  dropping?: readonly string[];
}
