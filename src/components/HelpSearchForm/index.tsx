'use client';

import type { FormEvent, ReactElement } from 'react';
import { MagnifierIcon } from '../Field/icons';
import type { HelpSearchFormProps } from './types';
import './index.scss';

// A plain GET form, so search works without JavaScript and makes no request while someone types
// (claude-docs/components/help-pages.md). The magnifier is the one submit, as in the compendium's box. Enter on a
// blank box is stopped here and goes nowhere; with no script it reaches the server, which shows no results.
const HelpSearchForm = ({ query = '', size }: HelpSearchFormProps): ReactElement => {
  const hero = size === 'hero';
  const submit = (event: FormEvent<HTMLFormElement>) => {
    const value = new FormData(event.currentTarget).get('q');
    if (typeof value !== 'string' || value.trim() === '') event.preventDefault();
  };
  return (
    <form
      className={hero ? 'help-search help-search--hero' : 'help-search'}
      role="search"
      action="/help/search"
      method="get"
      onSubmit={submit}
    >
      <button className="help-search__submit" type="submit">
        <MagnifierIcon />
        <span className="visually-hidden">Search</span>
      </button>
      <input
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
