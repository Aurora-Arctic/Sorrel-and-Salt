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

// A select over the viewer's workspaces (covens on screen); the current one is read off the
// address, so two tabs do not interfere. A viewer who may create gets a last choice whose value is
// the create page's path, which no slug can equal (claude-docs/components/workspace-switcher.md).

const CREATE = { value: NEW_COVEN_PATH, label: 'Create Coven', create: true };

function targetOf(path: string): NavigationTarget {
  if (path === NEW_COVEN_PATH) return { region: 'main', shape: 'form', frame: 'narrow' };
  return covenTarget(path);
}

// Set when a switch starts and read once by the next switcher to mount, so focus survives the
// `[slug]` layout's remount; a module variable survives it and, unlike `sessionStorage`, dies with
// the page. It holds the picked slug; a switcher anywhere else clears it and takes no focus.
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
        placeholder="Choose a coven"
      />
    </div>
  );
}
