import type { ReactElement } from 'react';
import type { HelpSearchFormProps } from './types';
import './index.scss';

// A plain GET form, so search works without JavaScript and makes no request while someone types
// (claude-docs/components/help-pages.md).
const HelpSearchForm = ({ query = '' }: HelpSearchFormProps): ReactElement => (
  <form className="help-search" role="search" action="/help/search" method="get">
    <input
      className="input"
      type="search"
      name="q"
      defaultValue={query}
      aria-label="Search Help"
      autoComplete="off"
    />
    <button className="btn btn--solid" type="submit">
      Search
    </button>
  </form>
);

export default HelpSearchForm;
