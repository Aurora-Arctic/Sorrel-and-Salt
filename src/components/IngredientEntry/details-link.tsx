import type { ReactElement } from 'react';
import { QuickLookLink } from '../IconTip';
import type { RouteModalLink } from '../Modal/types';
import { DETAILS_PLACE } from './details';

/** An entry's Quick Look: the eye in a list, opening the details modal over it at `opens`, so the press shows there. The name stays a plain link to the entry's page. */
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
