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
 * New Spell (M10.12), the Grimoire's action at its heading line's end: the admin lists' Add,
 * opening the spell builder's dialog at once under `?new=spell-<slug>` over the open tab, its filter
 * and page kept. The press writes the address in the browser (`drawnHere`), and the dialog
 * draws its empty form there, so it opens at its full size with no skeleton first. It replaces any other `?new`, the shell's Add Ingredient's, and drops a saved
 * spell's `?edit`, so one dialog opens. A client part because the layout holds it, and a
 * layout is not handed the tab's address; it reads it here instead.
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
