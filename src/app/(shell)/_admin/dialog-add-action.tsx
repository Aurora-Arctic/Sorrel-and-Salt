'use client';

import type { Route } from 'next';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactElement } from 'react';
import { NEW } from '@/components/AppShell/add-href';
import AddAction from './add-action';
import type { DialogAddActionProps } from './types';

/**
 * An Add whose dialog is opened by an address: this page's own, with `?new=<value>` set and the
 * rest of the list's filter kept. A client part, as a layout is not handed the page's address.
 */
export default function DialogAddAction({
  value,
  label,
  heading,
  dropping = [],
}: DialogAddActionProps): ReactElement {
  const path = usePathname();
  const query = new URLSearchParams(useSearchParams());
  for (const name of dropping) query.delete(name);
  query.set(NEW, value(path));
  return (
    <AddAction href={`${path}?${query}` as Route} heading={heading} drawnHere>
      {label}
    </AddAction>
  );
}
