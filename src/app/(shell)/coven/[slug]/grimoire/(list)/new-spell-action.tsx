'use client';

import type { ReactElement } from 'react';
import { NEW_SPELL_TITLE, spellValue } from '@/components/AppShell/add-href';
import { covenSlugOf } from '@/lib/coven-path';
import DialogAddAction from '@/app/(shell)/_admin/dialog-add-action';
import { newSpellHeading } from '@/components/SpellBuilder/spell-dialog';
import type { NewSpellActionProps } from './types';

/**
 * New Spell, the Grimoire's action: opens the builder's dialog at once under `?new=spell-<slug>`,
 * keeping the tab's filter and dropping `?edit`.
 */
export default function NewSpellAction({ covenName }: NewSpellActionProps): ReactElement {
  return (
    <DialogAddAction
      value={(path) => spellValue(covenSlugOf(path) ?? '')}
      label={NEW_SPELL_TITLE}
      heading={newSpellHeading(covenName)}
      dropping={['edit']}
    />
  );
}
