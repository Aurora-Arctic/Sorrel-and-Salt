import type { ReactElement } from 'react';
import type { HelpSearchFormProps } from './types';
import './index.scss';

// A plain GET form, so search works without JavaScript and makes no request while someone types
// (claude-docs/components/help-pages.md).
const HelpSearchForm = ({ query = '', size }: HelpSearchFormProps): ReactElement => {
  const hero = size === 'hero';
  return (
    <form
      className={hero ? 'help-search help-search--hero' : 'help-search'}
      role="search"
      action="/help/search"
      method="get"
    >
      {hero && (
        <svg
          className="help-search__magnifier"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      )}
      <input
        className="input"
        type="search"
        name="q"
        defaultValue={query}
        aria-label="Search Help"
        placeholder={hero ? 'Search Help' : undefined}
        autoComplete="off"
      />
      <button className="btn btn--solid" type="submit">
        Search
      </button>
    </form>
  );
};

export default HelpSearchForm;
