import type { Route } from 'next';
import type { ReactElement } from 'react';
import { AnnotateLink, EditLink } from '../IconTip';
import { cardName } from '../IngredientCard/card-name';
import { ANNOTATE_HEADING } from '../IngredientEntry/annotate-heading';
import CardMore from './card-more';
import type { CovenCardEntry } from './types';

// A coven card's foot controls, in one place so the list's cards and the Quick Look window
// opened from them draw the very same ones (the owner's call, 2026-10-20: the window's icons
// follow the card's). The dialog link first, Edit on the coven's own entry or Annotate on a
// compendium entry the cupboard holds, each only where the page gave its address; then the
// card's More (`card-more.tsx`) with whatever else the role may do, which draws nothing when it
// may do nothing more. Not a client file: it only composes the client controls, so a server
// page can call it and hand the result down. claude-docs/components/coven-cards.md.

/** What the foot's controls read of an entry, so the Quick Look window can pass the same. */
export type CovenCardActionsEntry = Pick<
  CovenCardEntry,
  | 'id'
  | 'label'
  | 'canonicalName'
  | 'editHref'
  | 'editHeading'
  | 'annotateHref'
  | 'mayDelete'
  | 'mayMakeOurs'
  | 'mayRemove'
>;

/** Named with the formal name too, as two entries can share a label. */
export const covenCardName = (entry: Pick<CovenCardEntry, 'label' | 'canonicalName'>): string =>
  cardName(entry.label, entry.canonicalName);

const opensOf = (entry: CovenCardActionsEntry): ReactElement | null => {
  if (entry.editHref && entry.editHeading)
    return (
      <EditLink href={entry.editHref} heading={entry.editHeading} name={covenCardName(entry)} />
    );
  if (entry.annotateHref)
    return (
      <AnnotateLink
        href={entry.annotateHref}
        heading={ANNOTATE_HEADING}
        name={covenCardName(entry)}
      />
    );
  return null;
};

/**
 * The foot's controls. `leaveHref`, for the Quick Look window, is where a delete or a remove
 * leads once it is done (the list without the window, which closes it); a card leaves it out
 * and reads its list again instead.
 */
export function covenCardActions(
  entry: CovenCardActionsEntry,
  workspaceId: string,
  covenSlug: string,
  leaveHref?: Route,
): ReactElement | undefined {
  const opens = opensOf(entry);
  const more = entry.mayDelete || entry.mayMakeOurs || entry.mayRemove;
  if (!opens && !more) return undefined;
  return (
    <>
      {opens}
      {more && (
        <CardMore
          id={entry.id}
          label={entry.label}
          name={covenCardName(entry)}
          workspaceId={workspaceId}
          covenSlug={covenSlug}
          mayDelete={entry.mayDelete}
          mayMakeOurs={entry.mayMakeOurs}
          mayRemove={entry.mayRemove}
          leaveHref={leaveHref}
        />
      )}
    </>
  );
}
