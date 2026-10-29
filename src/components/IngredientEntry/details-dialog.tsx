'use client';

import type { ReactElement } from 'react';
import { PendingLink } from '../../lib/navigation';
import { ingredientLinkTarget } from '../AppShell/site-target';
import LastEdit from '../LastEdit';
import { CompendiumEditLink, EditLink } from '../IconTip';
import EntryMarks, { RecencyMark } from '../EntryMarks';
import { RouteModal } from '../Modal';
import type { ModalHeading } from '../Modal/types';
import { SafetyMark } from '../SafetyNote';
import PlusMark from './plus-mark';
import { DETAILS_PLACE } from './details';
import type { IngredientDetailsDialogProps, IngredientDetailsOpened } from './types';

// The details modal an ingredient's name opens over a list, so an Edit inside opens the edit modal over
// it. A client part since RouteModal takes its body as a function (claude-docs/components/ingredient-entry.md,
// "Component notes").

/** The head's marks and actions: the top line's beside Close, and the end of the formal name's line holds the controls of the card the window opened from (claude-docs/components/ingredient-entry.md, "Component notes"). */
export function headingOf({
  lastEdit,
  heading,
  marks,
  editAction,
  actions: controls,
  more,
  plus,
  ingredientId,
}: IngredientDetailsOpened): ModalHeading {
  // The top line beside Close, as the entry page's top bar has it: New or Updated, then the one
  // safety badge; present for every entry so Close has it to itself.
  const top = (
    <>
      {marks && <RecencyMark recency={marks.recency} />}
      {marks && (
        <SafetyMark toxic={marks.toxic} safetyNotes={marks.safetyNotes} variants={marks.variants} />
      )}
    </>
  );
  // The entry's name as the card names it, for Edit and for the plus.
  const name = editAction?.name ?? heading.title;
  // The coven card's own controls where the page gave them; else the compendium card's Edit,
  // named as the card names the entry.
  const edit = controls ?? (editAction && <EditAction {...editAction} name={name} />);
  // The plus, or the check once every coven the viewer may add in holds the entry, left of the
  // pencil, as on the entry page (PlusMark).
  const add = plus && ingredientId && (
    <PlusMark plus={plus} ingredientId={ingredientId} name={name} />
  );
  // The compendium card's order: the plus, Edit in Compendium, then the three dots.
  const buttons = (add || edit || more) && (
    <>
      {add}
      {edit}
      {more}
    </>
  );
  return {
    ...heading,
    topEnd: top,
    ...(lastEdit && { aboveName: <LastEdit by={lastEdit.by} at={lastEdit.at} /> }),
    ...(buttons && { formalActions: buttons }),
    ...(marks && { under: <EntryMarks {...marks} safety={false} recency={null} /> }),
  };
}

/** The compendium card's Edit: Edit in Compendium on the public list, plain Edit on the admin's. */
const EditAction = ({
  inCompendium,
  ...link
}: NonNullable<IngredientDetailsOpened['editAction']> & { name: string }): ReactElement =>
  inCompendium ? <CompendiumEditLink {...link} /> : <EditLink {...link} />;

/** The link to the entry's page: a bar in the modal's `foot` slot, outside the scrolling body (claude-docs/components/ingredient-entry.md, "Component notes"). */
function PageLinkBar({ pageHref, footControl }: IngredientDetailsOpened): ReactElement {
  // Named by where it goes, not by who is looking: the public compendium's page, or the coven's own
  // page for an entry it holds.
  const label = pageHref.startsWith('/compendium/') ? 'See in Compendium' : 'See in Your Cupboard';
  return (
    <div
      className={
        footControl
          ? 'ingredient-details-foot ingredient-details-foot--control'
          : 'ingredient-details-foot'
      }
    >
      {footControl}
      <PendingLink
        className="btn"
        href={pageHref}
        navigationTarget={ingredientLinkTarget(pageHref)}
      >
        {label}
      </PendingLink>
    </div>
  );
}

export default function DetailsDialog({
  closeHref,
  opened,
}: IngredientDetailsDialogProps): ReactElement | null {
  return (
    <RouteModal
      place={DETAILS_PLACE}
      closeHref={closeHref}
      readingBody
      content={
        opened && {
          heading: headingOf(opened),
          body: () => opened.children,
          foot: <PageLinkBar {...opened} />,
        }
      }
    />
  );
}
