import type { ReactElement } from 'react';
import Spinner from '../Spinner';
import { MagnifierIcon } from './icons';

/** The magnifier that submits a search form, named Search. `busy` shows the spinner while a search is under way. */
export function SearchSubmit({
  id,
  className,
  busy = false,
}: {
  /** Lets a filter applied by a press on it give the focus back once the new list arrives (FilterForm). */
  id?: string;
  className: string;
  busy?: boolean;
}): ReactElement {
  return (
    <button id={id} type="submit" className={className} aria-busy={busy || undefined}>
      <MagnifierIcon />
      {busy && <Spinner />}
      <span className="visually-hidden">Search</span>
    </button>
  );
}

/** What every search input says about itself: a search box, and not a sign-in field, which 1Password documents this attribute to leave alone. */
export const SEARCH_INPUT_ATTRIBUTES = { type: 'search', 'data-1p-ignore': true } as const;
