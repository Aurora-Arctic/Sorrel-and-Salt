'use client';

import type { Route } from 'next';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReactElement } from 'react';
import { NEW, spellValue } from '@/components/AppShell/add-href';
import { covenSlugOf } from '@/lib/coven-path';
import AddAction from '@/app/(shell)/admin/add-action';
import { newSpellHeading } from '@/components/SpellBuilder/spell-dialog';
import type { NewSpellActionProps } from './types';

/**
 * New Spell, the Grimoire's action: opens the builder's dialog at once under `?new=spell-<slug>`,
 * keeping the tab's filter. The press writes the address in the browser (`drawnHere`) and drops
 * `?edit`. A client part, as a layout is not handed the tab's address.
 */
export default function NewSpellAction({ covenName }: NewSpellActionProps): ReactElement {
  const path = usePathname();
  const query = new URLSearchParams(useSearchParams());
  query.delete(NEW);
  query.delete('edit');
  // The grimoire's own address always names its coven, so the slug is there.
  query.set(NEW, spellValue(covenSlugOf(path) ?? ''));
  const href = `${path}?${query}` as Route;
  return (
    <AddAction href={href} heading={newSpellHeading(covenName)} drawnHere>
      New Spell
    </AddAction>
  );
}
