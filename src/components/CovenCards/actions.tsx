import type { Route } from 'next';
import type { ReactElement } from 'react';
import { AnnotateLink, EditLink } from '../IconTip';
import { cardName } from '../IngredientCard/card-name';
import { ANNOTATE_HEADING } from '../IngredientEntry/annotate-heading';
import StockDialog from '../StockDialog';
import CardMore from './card-more';
import type { CovenCardEntry } from './types';

// A coven card's foot controls, shared by the list's cards and Quick Look: Edit Stock where the page
// gave the stock and the role may update it, Edit (own entry) or Annotate (compendium entry), then
// `card-more.tsx`. Not a client file (claude-docs/components/coven-cards.md).

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
  | 'stock'
>;

/** Named with the formal name too, as two entries can share a label. */
export const covenCardName = (entry: Pick<CovenCardEntry, 'label' | 'canonicalName'>): string =>
  cardName(entry.label, entry.canonicalName);

/** Edit and Annotate in the text colour rather than the accent green, here and not in admin. */
const PLAIN = 'icon-tip__edit icon-tip__edit--plain';

const opensOf = (entry: CovenCardActionsEntry): ReactElement | null => {
  if (entry.editHref && entry.editHeading)
    return (
      <EditLink
        href={entry.editHref}
        heading={entry.editHeading}
        name={covenCardName(entry)}
        className={PLAIN}
      />
    );
  if (entry.annotateHref)
    return (
      <AnnotateLink
        href={entry.annotateHref}
        heading={ANNOTATE_HEADING}
        name={covenCardName(entry)}
        className={PLAIN}
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
  if (!opens && !entry.stock && !more) return undefined;
  return (
    <>
      {entry.stock && (
        <StockDialog
          workspaceId={workspaceId}
          ingredientId={entry.id}
          ingredientName={covenCardName(entry)}
          forms={entry.stock.forms}
          jars={entry.stock.jars}
        />
      )}
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
