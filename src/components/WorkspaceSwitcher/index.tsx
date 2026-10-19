'use client';

import { usePathname } from 'next/navigation';
import { type ReactElement, useEffect, useId, useRef, useState } from 'react';
import { NEW_COVEN_PATH, covenTarget, covenSlugOf, pathInCoven } from '../../lib/coven-path';
import { usePendingNavigation } from '../../lib/navigation';
import type { NavigationTarget } from '../../lib/navigation';
import { ComboboxSelect } from '../Combobox';
import type { WorkspaceSwitcherProps } from './types';
import './index.scss';

// A select over the viewer's workspaces, called covens on screen. Which one is current is read off the
// address, never kept in state, so two tabs in two workspaces do not
// interfere; choosing another goes to the same section there. The list is the
// caller's: the layout already holds the memberships. A viewer holding
// creation rights gets one more choice, after the workspaces, that goes to the
// create page (M9.16); its value is that page's path, which no slug can equal
// since a slug holds no slash. While the switch is on its way (M12.33) the
// box shows the pick, which is the one thing held in state, and is busy; the
// coven's body draws the destination's skeleton. See
// claude-docs/components/workspace-switcher.md.

const CREATE = { value: NEW_COVEN_PATH, label: 'Create Coven', create: true };

function targetOf(path: string): NavigationTarget {
  if (path === NEW_COVEN_PATH) return { region: 'main', shape: 'form', frame: 'narrow' };
  return covenTarget(path);
}

// Set when a switch to another coven starts, read once by the next switcher to
// mount. The `[slug]` layout, and with it this switcher, remounts when the
// coven changes, and the focus that was on the box would drop to the page. A
// module variable survives that remount, as component state cannot, and unlike
// `sessionStorage` it dies with the page, so a reload never refocuses. A
// switch that ends without a remount (a refusal) clears it, below. It holds
// the slug of the coven picked, not a bare yes: a switch that was superseded
// (Compendium clicked mid-switch) leaves its slug behind, and a switcher that
// mounts anywhere but that coven reads it as stale, clears it and takes no focus.
let focusAfterSwitch: string | undefined;

export default function WorkspaceSwitcher({
  workspaces,
  canCreate = false,
}: WorkspaceSwitcherProps): ReactElement {
  const id = useId();
  const pathname = usePathname();
  const { navigate, pending } = usePendingNavigation();
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
          const href =
            value === CREATE.value ? value : pathInCoven(pathname, value, chosen?.canReadMembers);
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
