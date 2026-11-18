import type { ReactNode, Ref } from 'react';
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
  /** Offered to every viewer, an unverified account included; any other link is a verified account's alone. */
  open?: boolean;
}

export interface SiteNavProps {
  links: readonly SiteLink[];
}

/** How the bar has room to show Add Ingredient: its label, a plus, or nothing, folded into the account panel. */
export type AddIngredientForm = 'label' | 'plus' | 'folded';

/** What the account panel's folded item calls: the button's main action. */
export interface AddIngredientHandle {
  add: () => void;
}

export interface AddIngredientButtonProps {
  viewer: ShellViewer;
  workspaces: readonly ShellWorkspace[];
  form?: AddIngredientForm;
  handle?: Ref<AddIngredientHandle>;
}

export interface ShellEndProps {
  viewer: ShellViewer;
  workspaces: readonly ShellWorkspace[];
  links: readonly SiteLink[];
}

export type AddDestination =
  | { kind: 'compendium'; key: string; name: string }
  | { kind: 'coven'; key: string; name: string; workspace: ShellWorkspace };

export interface PausedNoticeProps {
  until: Date | null;
  className: string;
}
