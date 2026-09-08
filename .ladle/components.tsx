import type { ReactNode } from 'react';
import './theme.scss';

// Ladle loads this file once, ahead of every story. M0.30 uses it for one
// thing: pull in the theme token layer (./theme.scss) so a component's
// `var(--accent)` / `var(--surface-page)` / … resolve to real values in the
// workshop the way they do in the app. See .ladle/theme.scss for why that is a
// trimmed copy of globals.scss rather than the file itself.
//
// The decorator proper is M0.31, and this file is where it gets built: the
// app-surface frame around each story, a containing block so a `position: fixed`
// component (ThemeToggle) sits in the story frame instead of the viewport, and
// a light/dark toolbar control wired through the M0.29 helper. Until then this
// Provider is a passthrough.
export const Provider = ({ children }: { children: ReactNode }): ReactNode => children;
