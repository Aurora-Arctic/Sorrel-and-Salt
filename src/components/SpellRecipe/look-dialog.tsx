'use client';

import type { ReactElement } from 'react';
import { PendingLink } from '../../lib/navigation';
import LastEdit from '../LastEdit';
import { RouteModal } from '../Modal';
import type { ModalHeading } from '../Modal/types';
import Notice from '../Notice';
import { SPELL_LOOK_PLACE, UNTITLED_SPELL } from '../SpellCard';
import type { SpellLookDialogProps } from './types';
import './index.scss';

// The Quick Look modal a grimoire card's eye opens over the list (M13.21), the spell's twin of
// the ingredient details modal (M12.5): the spell read in the shared body, the last edit over
// its title, a link through to the recipe page at the foot's start, and, for a role that may
// update the spell, Edit Spell at its end. Edit Spell is a plain link to the list's address with `?edit=<id>` in
// place of `?spell=<id>`, which the spell builder's dialog (M10.12) answers, so one dialog shows
// at a time and closing the builder returns to the list rather than to this modal. A client
// part because RouteModal takes its body as a function, which a server page cannot hand down;
// the body arrives as the page's rendered children.

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
              {opened.editHref && (
                <PendingLink className="btn btn--solid" href={opened.editHref}>
                  Edit Spell
                </PendingLink>
              )}
            </div>
          ),
        }
      }
    />
  );
}
