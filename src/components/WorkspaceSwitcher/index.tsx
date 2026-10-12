'use client';

import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactElement, useId } from 'react';
import { NEW_COVEN_PATH, covenSlugOf, pathInCoven } from '../../lib/coven-path';
import { ComboboxSelect } from '../Combobox';
import type { WorkspaceSwitcherProps } from './types';
import './index.scss';

// A select over the viewer's workspaces. Which one is current is read off the
// address, never kept in state, so two tabs in two workspaces do not
// interfere; choosing another goes to the same section there. The list is the
// caller's: the layout already holds the memberships. A viewer holding
// creation rights gets one more choice, after the workspaces, that goes to the
// create page (M9.16); its value is that page's path, which no slug can equal
// since a slug holds no slash. See claude-docs/components/workspace-switcher.md.

const CREATE = { value: NEW_COVEN_PATH, label: 'Create Workspace' };

export default function WorkspaceSwitcher({
  workspaces,
  canCreate = false,
}: WorkspaceSwitcherProps): ReactElement {
  const id = useId();
  const pathname = usePathname();
  const router = useRouter();
  const choices = workspaces.map(({ slug, name }) => ({ value: slug, label: name }));

  return (
    <div className="workspace-switcher">
      <ComboboxSelect
        id={id}
        label="Workspace"
        value={covenSlugOf(pathname) ?? ''}
        onChange={(value) =>
          router.push((value === CREATE.value ? value : pathInCoven(pathname, value)) as Route)
        }
        choices={canCreate ? [...choices, CREATE] : choices}
        placeholder="Select Workspace"
      />
    </div>
  );
}
