import type { Route } from 'next';
import type { ReactElement } from 'react';
import { cardName } from '../../lib/ingredient-name';
import { ANNOTATE_HEADING } from '../IngredientEntry/annotate-heading';
import StockDialog from '../StockDialog';
import CardMore from './card-more';
import { CardAnnotateLink, CardEditLink } from './sortable-links';
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
  | 'mayMakeOurs'
  | 'mayRemove'
  | 'stock'
>;

/** Edit and Annotate in the text colour rather than the accent green, here and not in admin. */
const PLAIN = 'icon-tip__edit icon-tip__edit--plain';

const opensOf = (entry: CovenCardActionsEntry, name: string): ReactElement | null => {
  if (entry.editHref && entry.editHeading)
    return (
      <CardEditLink
        href={entry.editHref}
        heading={entry.editHeading}
        name={name}
        className={PLAIN}
      />
    );
  if (entry.annotateHref)
    return (
      <CardAnnotateLink
        href={entry.annotateHref}
        heading={ANNOTATE_HEADING}
        name={name}
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
  const name = cardName(entry.label, entry.canonicalName);
  const opens = opensOf(entry, name);
  const more = entry.mayMakeOurs;
  if (!opens && !entry.stock && !more) return undefined;
  return (
    <>
      {entry.stock && (
        <StockDialog
          workspaceId={workspaceId}
          ingredientId={entry.id}
          ingredientName={name}
          forms={entry.stock.forms}
          jars={entry.stock.jars}
        />
      )}
      {opens}
      {more && (
        <CardMore
          id={entry.id}
          label={entry.label}
          name={name}
          workspaceId={workspaceId}
          covenSlug={covenSlug}
          mayMakeOurs={entry.mayMakeOurs}
          mayRemove={entry.mayRemove}
          leaveHref={leaveHref}
        />
      )}
    </>
  );
}
