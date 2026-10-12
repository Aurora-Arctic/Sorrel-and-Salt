import type { ReactNode } from 'react';
import type { Route } from 'next';
import type { ShellViewer, ShellWorkspace } from '../../lib/types';

export interface AppShellProps {
  viewer: ShellViewer;
  /** Every coven the viewer belongs to; the brand and Your Coven link to the first. */
  workspaces: readonly ShellWorkspace[];
  children: ReactNode;
}

/** One link in the bar's site nav. */
export interface SiteLink {
  label: string;
  href: Route;
  /** The address the link is "at" when the page is beneath it, which can differ from `href` (Your Coven). */
  base: string;
}

export interface SiteNavProps {
  links: readonly SiteLink[];
}
