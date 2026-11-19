'use client';

import { hasText } from '@/lib/text';
import { type FormEvent, type ReactElement, useRef } from 'react';
import { useFollowShown } from '@/lib/use-draft';
import { usePathname } from 'next/navigation';
import { useNavigationState, usePendingNavigation } from '../../lib/navigation';
import { helpHomeOf, leavesStaffHelp } from '../../lib/navigation/staff-help';
import { useShutRow } from '@/lib/use-shut-row';
import { SEARCH_INPUT_ATTRIBUTES, SearchSubmit } from '../Field/search-submit';
import type { HelpSearchFormProps } from './types';

// A GET form, so search works without JavaScript and makes no request while someone types; with script the submit
// goes through the site's navigation instead, as the browser's own page load would show nothing until the results
// arrived (claude-docs/components/help-search-form.md). The magnifier is the one submit, as in the compendium's box. A
// blank box goes back to the help index, or nowhere on it; with no script the server sends a blank search there too.
const HelpSearchForm = ({ query = '', size }: HelpSearchFormProps): ReactElement => {
  const hero = size === 'hero';
  const { pending, navigate } = usePendingNavigation();
  const pathname = usePathname();
  const { busy, href } = useNavigationState();
  // A search sent from a staff page leaves for the public help layout, so typing here would be lost: shut until it
  // arrives. This box and the placeholder's own both read the same navigation.
  const shut = busy && href !== undefined && leavesStaffHelp(pathname, href);
  const row = useRef<HTMLFormElement>(null);
  useShutRow(row, shut);
  // A box that stays mounted across pages takes each new page's words, but keeps what was typed since the search it
  // sent, set rather than remounted so a search still under way keeps its spinner.
  const box = useRef<HTMLInputElement>(null);
  const markSent = useFollowShown(
    query,
    (words) => {
      if (box.current) box.current.value = words;
    },
    (words) => words.trim(),
  );
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('q');
    markSent(typeof value === 'string' ? value : '');
    if (typeof value !== 'string' || !hasText(value)) {
      const home = helpHomeOf(pathname);
      if (pathname !== home) navigate(home);
      return;
    }
    navigate(`/help/search?${new URLSearchParams({ q: value.trim() })}`);
  };
  return (
    <form
      ref={row}
      className={hero ? 'help-search help-search--hero' : 'help-search'}
      role="search"
      action="/help/search"
      method="get"
      onSubmit={submit}
    >
      <SearchSubmit className="help-search__submit" busy={pending} />
      <input
        className="input"
        {...SEARCH_INPUT_ATTRIBUTES}
        name="q"
        ref={box}
        defaultValue={query}
        aria-label="Search Help"
        placeholder="Search Help"
        autoComplete="off"
      />
    </form>
  );
};

export default HelpSearchForm;
