import type { ReactNode } from 'react';
import type { ADMIN_PAGES } from '../src/components/AdminNav/sections';

/** What `AdminTabbedFrame` draws a story inside (./admin-frame.tsx). */
export interface AdminTabbedFrameProps {
  /** The admin page, by its key in `ADMIN_PAGES`: its heading and its tabs. */
  page: keyof typeof ADMIN_PAGES;
  /** The address the workshop pretends to be on, which opens a tab; the page's first tab by default. */
  open?: string;
  /** What the page header draws at the end of its line: the open tab's Add, say. */
  action?: ReactNode;
  /** Draws the admin nav beside the page, as the layout does at a desktop's width. */
  nav?: boolean;
  children: ReactNode;
}
