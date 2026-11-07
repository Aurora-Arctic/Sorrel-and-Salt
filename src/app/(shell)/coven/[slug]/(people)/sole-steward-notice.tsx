import type { ReactElement } from 'react';
import Notice from '@/components/Notice';

// The members list's warning for a coven with one steward: the page shows it for that case and its
// skeleton shows it too, since a coven starts with one and the line is tall enough to move the list.
export const SoleStewardNotice = (): ReactElement => (
  <Notice kind="warn" quiet>
    This coven has one steward. If that person loses access, nobody can manage its members. Make
    another member a steward to be safe.
  </Notice>
);
