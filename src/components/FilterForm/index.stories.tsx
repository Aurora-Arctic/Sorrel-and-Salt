import type { Story } from '@ladle/react';
import type { Route } from 'next';
import { useState } from 'react';
import { listHref } from '../../lib/list-href';
import ListFrame from '../ListFrame';
import FilterForm from '.';

// Render-only; the lists that use it assert their filters. A filter sits in
// its list's ListFrame, which holds its navigation; the workshop's router
// goes nowhere, so a press shows nothing on its way here (GroupedValueList's
// `Pending` stories draw that). The fields are the caller's: a name and a group here, as
// a value list's are, with Filter offered once either differs from the
// filter shown, and Clear while the filter shown or the fields are
// not blank.
export default {
  title: 'Forms / Filter Form',
};

const PATH = '/admin/categories' as Route;

const NO_FILTER = { query: '', group: '' };

const ValueFilter = ({ shown = NO_FILTER }: { shown?: typeof NO_FILTER }) => {
  const [query, setQuery] = useState(shown.query);
  const [group, setGroup] = useState(shown.group);
  return (
    <ListFrame>
      <FilterForm
        label="Filter Categories"
        action={PATH}
        href={() => listHref(PATH, { query: query.trim(), group })}
        disabled={query.trim() === shown.query && group === shown.group}
        shown={[shown.query, shown.group]}
        draft={[query, group]}
        onClear={() => {
          setQuery('');
          setGroup('');
        }}
        navigation="soft"
      >
        <div className="field">
          <label className="field__label" htmlFor="story-filter-query">
            Name
          </label>
          <input
            id="story-filter-query"
            className="input"
            type="search"
            name="query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="story-filter-group">
            Group
          </label>
          <select
            id="story-filter-group"
            className="select"
            name="group"
            value={group}
            onChange={(event) => setGroup(event.target.value)}
          >
            <option value="">Any</option>
            <option value="fixture-substance">Fixture Substance</option>
            <option value="testwort-wards">Testwort Wards</option>
          </select>
        </div>
      </FilterForm>
    </ListFrame>
  );
};

// Type in Name, or pick a group, to offer Filter and Clear, which
// empties the fields where they are: the filter shown is blank.
export const Default: Story = () => <ValueFilter />;

export const PhoneDark: Story = () => <ValueFilter />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <ValueFilter />;
PhoneLight.meta = { theme: 'light', width: 375 };

// A page showing a filter: Clear links to the page itself.
const FILTER = { query: 'test', group: 'testwort-wards' };

export const Filtered: Story = () => <ValueFilter shown={FILTER} />;

export const FilteredPhoneDark: Story = () => <ValueFilter shown={FILTER} />;
FilteredPhoneDark.meta = { theme: 'dark', width: 375 };

export const FilteredPhoneLight: Story = () => <ValueFilter shown={FILTER} />;
FilteredPhoneLight.meta = { theme: 'light', width: 375 };
