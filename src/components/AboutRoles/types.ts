import type { ReactNode } from 'react';

export interface AboutRole {
  /** The role's name, such as "The Owner". Title Case. */
  heading: string;
  text: string;
  /** A drawing from `IconTip/icons.tsx`, shown beside the heading; decorative, so it is hidden from a screen reader. */
  icon?: ReactNode;
}

export interface AboutRolesProps {
  roles: readonly AboutRole[];
}
