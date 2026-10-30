'use client';

import type { ReactElement } from 'react';
import { PendingLink } from '../../lib/navigation';
import { EditLink } from '../IconTip';
import LastEdit from '../LastEdit';
import { RouteModal } from '../Modal';
import type { ModalHeading } from '../Modal/types';
import Notice from '../Notice';
import { SPELL_LOOK_PLACE, UNTITLED_SPELL } from '../SpellCard';
import SpellMarks from '../SpellMarks';
import type { SpellLookDialogProps } from './types';
import './index.scss';

// The Quick Look modal a grimoire card's eye opens: the spell body, last edit, the Draft and Private
// badges, Edit for a role that may, and a link to the recipe page; no Delete, which lives in Edit Spell.
// A client part for RouteModal (claude-docs/components/spell-recipe.md, "The Quick Look component").

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
          heading: { title: 'Spell Recipe' },
          body: () => <Notice kind="error">This spell could not be read. Try again.</Notice>,
        }}
      />
    );
  }
  const name = opened ? opened.title?.trim() || UNTITLED_SPELL : '';
  const heading: ModalHeading | undefined = opened && {
    title: name,
    // Edit as an icon at the end of the title's line, as the ingredient's Quick Look has it.
    ...(opened.editHref && {
      formalActions: (
        <EditLink
          href={opened.editHref}
          name={name}
          heading={{ eyebrow: 'Edit Spell', title: name }}
        />
      ),
      actionsUnderClose: true,
    }),
    ...(opened.lastEdit && {
      aboveName: <LastEdit by={opened.lastEdit.by} at={opened.lastEdit.at} />,
    }),
    // Under the title, as the ingredient's Quick Look has its marks; a complete shared spell has none.
    ...((opened.status === 'draft' || opened.visibility === 'private') && {
      under: <SpellMarks status={opened.status} visibility={opened.visibility} />,
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
            <div className="ingredient-details-foot">
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
