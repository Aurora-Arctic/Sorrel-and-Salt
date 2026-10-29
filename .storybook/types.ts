import type { ReactNode } from 'react';
import type { ShellViewer, ShellWorkspace } from '../src/lib/types';
import type { ADMIN_PAGES } from '../src/components/AdminNav/sections';

/** What `AdminFrame` draws a story inside (./admin-frame.tsx). */
export interface AdminFrameProps {
  /** The address the workshop pretends to be on, which decides the nav's current page. */
  open?: string;
  /** False for a curator's nav, without People; true by default. */
  managesPeople?: boolean;
  /**
   * Draw the app shell's bar above the admin row, as the site does, with the phone's bottom
   * bar pinned (the frame goes bare by itself while the shell is on the page, story-frame.scss).
   */
  shell?: boolean;
  children?: ReactNode;
}

/** What `AdminTabbedFrame` draws a story inside (./admin-frame.tsx). */
export interface AdminTabbedFrameProps {
  /** The admin page, by its key in `ADMIN_PAGES`: its heading and its tabs. */
  page: keyof typeof ADMIN_PAGES;
  /** The address the workshop pretends to be on, which opens a tab; the page's first tab by default. */
  open?: string;
  /** What the page header draws at the end of its line: the open tab's Add, say. */
  action?: ReactNode;
  /** As `AdminFrame`'s `shell`. */
  shell?: boolean;
  children: ReactNode;
}

/** What `ShellFrame` draws a story inside (./shell-frame.tsx). */
export interface ShellFrameProps {
  /** Which area's context row to draw: a coven's (switcher and nav), the admin area's, the create page's (the switcher alone), or none (the account pages). */
  area?: 'coven' | 'admin' | 'new' | 'none';
  /** In the admin area: an `admin` sees People in the nav, a `curator` does not. Default `admin`. */
  role?: 'curator' | 'admin';
  /** The viewer, by what differs from a verified member who may not create covens. */
  viewer?: Partial<ShellViewer>;
  /** The viewer's covens; three fixture ones by default. */
  workspaces?: readonly ShellWorkspace[];
  /** The address the workshop pretends to be on. */
  open?: string;
  /** Draw the header a visitor with no session gets (`PublicFrame`) in place of the shell; `area`, `viewer` and `workspaces` are then unused. */
  signedOut?: boolean;
  children?: ReactNode;
}
