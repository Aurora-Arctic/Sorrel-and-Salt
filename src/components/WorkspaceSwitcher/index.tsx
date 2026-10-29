'use client';

import { usePathname } from 'next/navigation';
import { type ReactElement, useEffect, useId, useRef, useState } from 'react';
import { NEW_COVEN_PATH, covenTarget, covenSlugOf, pathInCoven } from '../../lib/coven-path';
import { usePendingNavigation } from '../../lib/navigation';
import type { NavigationTarget } from '../../lib/navigation';
import { ComboboxSelect } from '../Combobox';
import { useCovenSwitchRegistration } from '../CovenSwitchTargets/context';
import type { WorkspaceSwitcherProps } from './types';
import './index.scss';

// A select over the viewer's workspaces, called covens on screen; the current one is read off the
// address, never kept in state, so two tabs do not interfere. A switch goes to the same page there
// when the page said it opens there, else the same section; a viewer who may create gets a last
// choice whose value is the create page's path, which no slug can equal. While a switch is on its
// way the box shows the pick, the one state held, and is busy.
// claude-docs/components/workspace-switcher.md.

const CREATE = { value: NEW_COVEN_PATH, label: 'Create Coven', create: true };

function targetOf(path: string): NavigationTarget {
  if (path === NEW_COVEN_PATH) return { region: 'main', shape: 'form', frame: 'narrow' };
  return covenTarget(path);
}

// Set when a switch to another coven starts and read once by the next switcher to mount, so focus
// survives the `[slug]` layout's remount; a module variable survives it and, unlike
// `sessionStorage`, dies with the page. It holds the picked coven's slug: a switcher mounting
// anywhere else reads it as stale, clears it and takes no focus. A switch ending without a remount
// clears it.
let focusAfterSwitch: string | undefined;

export default function WorkspaceSwitcher({
  workspaces,
  canCreate = false,
}: WorkspaceSwitcherProps): ReactElement {
  const id = useId();
  const pathname = usePathname();
  const { navigate, pending } = usePendingNavigation();
  const registration = useCovenSwitchRegistration();
  const [picked, setPicked] = useState<string>();
  const box = useRef<HTMLDivElement>(null);
  const choices = workspaces.map(({ slug, name }) => ({ value: slug, label: name }));

  useEffect(() => {
    if (focusAfterSwitch === undefined) return;
    const arrivedAt = focusAfterSwitch === covenSlugOf(pathname);
    focusAfterSwitch = undefined;
    if (arrivedAt) box.current?.focus();
    // Read once, on mount: the address then is the mount's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // The switch is over and this box is still here: the address changed
  // without a remount, or the move failed. Either way nothing is to be refocused.
  useEffect(() => {
    if (!pending) {
      focusAfterSwitch = undefined;
      setPicked(undefined);
    }
  }, [pending]);

  return (
    <div className="workspace-switcher">
      <ComboboxSelect
        id={id}
        label="Coven"
        value={(pending ? picked : undefined) ?? covenSlugOf(pathname) ?? ''}
        busy={pending}
        inputRef={box}
        onChange={(value) => {
          const chosen = workspaces.find((workspace) => workspace.slug === value);
          // A page that said which covens it opens in is believed only at its own address.
          const opens = registration?.path === pathname ? registration.slugs : undefined;
          const href =
            value === CREATE.value
              ? value
              : pathInCoven(pathname, value, {
                  canReadMembers: chosen?.canReadMembers,
                  canInvite: chosen?.canInvite,
                  opens,
                });
          setPicked(value);
          focusAfterSwitch = value === CREATE.value ? undefined : value;
          navigate(href, { target: targetOf(href) });
        }}
        choices={canCreate ? [...choices, CREATE] : choices}
        placeholder="Select Coven"
      />
    </div>
  );
}
