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

// The details modal an ingredient's name opens over a list (M12.5), in the
// list's details place, so an Edit pressed inside it opens the edit modal in
// the list's other place, over it. A client part because RouteModal takes its
// body as a function, which a server page cannot hand down; the summary
// arrives as the page's rendered children. Its New or Updated marker and safety badge stand on
// the top line beside Close, through the modal's `topEnd`, its Edit pencil and plus end the
// formal name's line through `formalActions` (claude-docs/components/modal.md, "A title with its own
// end"), and the link to the entry's page is a bar at its foot.

/**
 * The head's marks and actions (the owner's calls, 2026-10-20). On the top line beside Close, as the
 * entry page's top bar has them: New or Updated, then the one safety badge, Toxic over Caution.
 * At the end of the formal name's line, over the name: the controls of the card the window was
 * opened from (the owner's call, 2026-10-20), made by the same components, so the two cannot
 * differ. On a compendium list, the card's Edit pencil (a press opening the edit modal at once
 * under its head, M9.18) with the plus, or the check once every coven the viewer may add in holds
 * the entry, left of it; on a coven's list, the coven card's Edit or Annotate and its More or
 * bin (`actions`). Under the formal name: the other badges.
 */
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
  // The top line's, beside Close, as the entry page's own top bar has them: New or Updated, then
  // the one safety badge. The line is there for every entry, empty or not, so Close has it to
  // itself and the head's other lines are clear of it.
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
  // The plus, or the check once every coven the viewer may add in holds the entry, stands left of
  // the pencil, the entry page's own pair (PlusMark; the owner's call, 2026-10-20).
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
    ...((marks || reviewLine) && {
      // The badges, then the review line as the head's last row (it fills a row of its own).
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

/** The compendium card's Edit: Edit in Compendium on the public list, plain Edit on the admin's. */
const EditAction = ({
  inCompendium,
  ...link
}: NonNullable<IngredientDetailsOpened['editAction']> & { name: string }): ReactElement =>
  inCompendium ? <CompendiumEditLink {...link} /> : <EditLink {...link} />;

/**
 * The link to the entry's page: a bar at the foot of the modal, in its `foot` slot outside the scrolling body
 * (the owner's calls, 2026-10-20), holding the one green outline button, the
 * site's plain `.btn` at its normal size, centred and two thirds of the bar. Still a link, to the entry's page,
 * with the loading standard's target.
 */
function PageLinkBar({ pageHref }: IngredientDetailsOpened): ReactElement {
  // Named by where it goes, not by who is looking (the owner's call, 2026-10-20): the
  // public compendium's page, or a coven's own page for an entry the coven holds, whether
  // it made the entry or annotated the compendium's.
  const label = pageHref.startsWith('/compendium/') ? 'See in Compendium' : 'See in Your Cupboard';
  return (
    <div className="ingredient-details-foot">
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
