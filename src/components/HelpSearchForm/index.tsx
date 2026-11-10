'use client';

import { type FormEvent, type ReactElement, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { usePendingNavigation } from '../../lib/navigation';
import { MagnifierIcon } from '../Field/icons';
import Spinner from '../Spinner';
import type { HelpSearchFormProps } from './types';
import './index.scss';

// A GET form, so search works without JavaScript and makes no request while someone types; with script the submit
// goes through the site's navigation instead, as the browser's own page load would show nothing until the results
// arrived (claude-docs/components/help-search-form.md). The magnifier is the one submit, as in the compendium's box. A
// blank box goes back to the help index, or nowhere on it; with no script the server sends a blank search there too.
const HelpSearchForm = ({ query = '', size }: HelpSearchFormProps): ReactElement => {
  const hero = size === 'hero';
  const { pending, navigate } = usePendingNavigation();
  const pathname = usePathname();
  // A box that stays mounted across pages takes each new page's words, set rather than remounted so a search still
  // under way keeps its spinner.
  const box = useRef<HTMLInputElement>(null);
  const shown = useRef(query);
  useEffect(() => {
    if (shown.current === query) return;
    shown.current = query;
    if (box.current) box.current.value = query;
  }, [query]);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('q');
    if (typeof value !== 'string' || value.trim() === '') {
      if (pathname !== '/help') navigate('/help');
      return;
    }
    navigate(`/help/search?${new URLSearchParams({ q: value.trim() })}`);
  };
  return (
    <form
      className={hero ? 'help-search help-search--hero' : 'help-search'}
      role="search"
      action="/help/search"
      method="get"
      onSubmit={submit}
    >
      <button className="help-search__submit" type="submit" aria-busy={pending || undefined}>
        <MagnifierIcon />
        {pending && <Spinner />}
        <span className="visually-hidden">Search</span>
      </button>
      <input
        ref={box}
        className="input"
        type="search"
        name="q"
        defaultValue={query}
        aria-label="Search Help"
        placeholder="Search Help"
        autoComplete="off"
        // Not a sign-in field; 1Password documents this attribute to leave a field alone.
        data-1p-ignore
      />
    </form>
  );
};

export default HelpSearchForm;
