'use client';

import type { ReactElement } from 'react';
import { PendingLink } from '../../lib/navigation';
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
// "The details modal").

/** The head's marks and actions: the top line's beside Close, and the end of the formal name's line holds the controls of the card the window opened from (claude-docs/components/ingredient-entry.md, "The details modal"). */
export function headingOf({
  lastEdit,
  heading,
  marks,
  editAction,
  actions: controls,
  more,
  plus,
  ingredientId,
  reviewLine,
}: IngredientDetailsOpened): ModalHeading {
  const top = (
    <>
      {marks && <RecencyMark recency={marks.recency} />}
      {marks && (
        <SafetyMark toxic={marks.toxic} safetyNotes={marks.safetyNotes} variants={marks.variants} />
      )}
    </>
  );
  const name = editAction?.name ?? heading.title;
  const edit = controls ?? (editAction && <EditAction {...editAction} name={name} />);
  const add = plus && ingredientId && (
    <PlusMark plus={plus} ingredientId={ingredientId} name={name} />
  );
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
    ...((marks || reviewLine) && {
      under: (
        <>
          {marks && (
            // The row draws the review badge itself, so the marks leave it out beside the row.
            <EntryMarks
              {...marks}
              reviewedAt={reviewLine ? undefined : marks.reviewedAt}
              safety={false}
              recency={null}
            />
          )}
          {reviewLine}
        </>
      ),
    }),
  };
}

const EditAction = ({
  inCompendium,
  ...link
}: NonNullable<IngredientDetailsOpened['editAction']> & { name: string }): ReactElement =>
  inCompendium ? <CompendiumEditLink {...link} /> : <EditLink {...link} />;

/** The link to the entry's page: a bar in the modal's `foot` slot, outside the scrolling body (claude-docs/components/ingredient-entry.md, "The details modal"). */
function PageLinkBar({ pageHref }: IngredientDetailsOpened): ReactElement {
  const label = pageHref.startsWith('/compendium/') ? 'See in Compendium' : 'See in Your Cupboard';
  return (
    <div className="ingredient-details-foot">
      <PendingLink className="btn" href={pageHref}>
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
