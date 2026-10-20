import type { ReactElement } from 'react';
import { QuickLookLink } from '../IconTip';
import type { RouteModalLink } from '../Modal/types';
import { DETAILS_PLACE } from './details';

/**
 * An entry's Quick Look in a list (M12.5): the eye at a card's foot, or left
 * of a row's name, opening its details modal over the list, `opens`, in the
 * details place, so the press shows there and not in the list's edit modal. The name itself stays a
 * plain link to the entry's page (the owner's call, 2026-10-20).
 */
export default function DetailsLink({
  opens,
  name,
}: {
  opens: RouteModalLink;
  /** The entry's label and formal name, read after "Quick Look". */
  name: string;
}): ReactElement {
  return (
    <QuickLookLink href={opens.href} heading={opens.heading} name={name} place={DETAILS_PLACE} />
  );
}
