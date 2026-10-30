'use client';

import type { ReactElement } from 'react';
import { PendingLink } from '../../lib/navigation';
import { EditLink } from '../IconTip';
import LastEdit from '../LastEdit';
import { RouteModal } from '../Modal';
import type { ModalHeading } from '../Modal/types';
import Notice from '../Notice';
import { SPELL_LOOK_PLACE, UNTITLED_SPELL } from '../SpellCard';
import DeleteSpellAction from './delete-spell';
import type { SpellLookDialogProps } from './types';
import './index.scss';

// The Quick Look modal a grimoire card's eye opens: the spell body, last edit, Edit's pencil and
// Delete Spell's bin for roles that may, and a link to the recipe page; a client part for RouteModal
// (claude-docs/components/spell-recipe.md, "The Quick Look component").

export default function SpellLookDialog({
  closeHref,
  opened,
  failed,
}: SpellLookDialogProps): ReactElement | null {
  if (failed) {
    // The read failed for a reason other than "no such spell": say so, rather than draw
    // a modal that reads as an empty spell. Nothing of the spell is known, so the head is plain.
    return (
      <RouteModal
        place={SPELL_LOOK_PLACE}
        closeHref={closeHref}
        readingBody
        content={{
          heading: { title: 'Spell Details' },
          body: () => <Notice kind="error">This spell could not be read. Try again.</Notice>,
        }}
      />
    );
  }
  const name = opened ? opened.title?.trim() || UNTITLED_SPELL : '';
  const heading: ModalHeading | undefined = opened && {
    title: name,
    // Edit and Delete as icons at the end of the title's line, as the ingredient's Quick Look has them.
    ...((opened.editHref || opened.deleteSpell) && {
      formalActions: (
        <span className="spell-look-actions">
          {opened.editHref && (
            <EditLink
              href={opened.editHref}
              name={name}
              heading={{ eyebrow: 'Edit Spell', title: name }}
            />
          )}
          {opened.deleteSpell && <DeleteSpellAction {...opened.deleteSpell} name={name} />}
        </span>
      ),
    }),
    ...(opened.lastEdit && {
      aboveName: <LastEdit by={opened.lastEdit.by} at={opened.lastEdit.at} />,
    }),
  };
  return (
    <RouteModal
      place={SPELL_LOOK_PLACE}
      closeHref={closeHref}
      readingBody
      content={
        opened &&
        heading && {
          heading,
          body: () => <div className="spell-recipe-look">{opened.children}</div>,
          foot: (
            <div className="ingredient-details-foot spell-look-foot">
              <PendingLink className="btn" href={opened.recipeHref}>
                See Full Recipe
              </PendingLink>
            </div>
          ),
        }
      }
    />
  );
}
