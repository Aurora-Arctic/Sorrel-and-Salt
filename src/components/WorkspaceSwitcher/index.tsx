'use client';

import type { Route } from 'next';
import { usePathname, useRouter } from 'next/navigation';
import { type ReactElement, useId } from 'react';
import { covenSlugOf, pathInCoven } from '../../lib/coven-path';
import { ComboboxSelect } from '../Combobox';
import type { WorkspaceSwitcherProps } from './types';
import './index.scss';

// A select over the viewer's workspaces. Which one is current is read off the
// address, never kept in state, so two tabs in two workspaces do not
// interfere; choosing another goes to the same section there. The list is the
// caller's: the layout already holds the memberships. See
// claude-docs/components/workspace-switcher.md.

export default function WorkspaceSwitcher({ workspaces }: WorkspaceSwitcherProps): ReactElement {
  const id = useId();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="workspace-switcher">
      <ComboboxSelect
        id={id}
        label="Workspace"
        value={covenSlugOf(pathname) ?? ''}
        onChange={(slug) => router.push(pathInCoven(pathname, slug) as Route)}
        choices={workspaces.map(({ slug, name }) => ({ value: slug, label: name }))}
        placeholder="Select Workspace"
      />
    </div>
  );
}
