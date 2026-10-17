import type { ReactNode } from 'react';
import type { Route } from 'next';
import type { ShellViewer, ShellWorkspace } from '../../lib/types';

export interface AppShellProps {
  viewer: ShellViewer;
  /** The viewer's covens, in the switcher's order: the brand and Your Coven go into the first. */
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

export interface AddIngredientButtonProps {
  viewer: ShellViewer;
  workspaces: readonly ShellWorkspace[];
}
