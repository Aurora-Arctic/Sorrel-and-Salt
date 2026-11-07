import type { ReactNode } from 'react';
import type { Route } from 'next';
import type { ShellViewer, ShellWorkspace } from '../../lib/types';

export interface AppShellProps {
  viewer: ShellViewer;
  workspaces: readonly ShellWorkspace[];
  children: ReactNode;
}

export interface SiteLink {
  label: string;
  href: Route;
  base: string;
}

export interface SiteNavProps {
  links: readonly SiteLink[];
}

export interface AddIngredientButtonProps {
  viewer: ShellViewer;
  workspaces: readonly ShellWorkspace[];
}

export type AddDestination =
  | { kind: 'compendium'; key: string; name: string }
  | { kind: 'coven'; key: string; name: string; workspace: ShellWorkspace };

export interface PausedNoticeProps {
  until: Date | null;
  className: string;
}
