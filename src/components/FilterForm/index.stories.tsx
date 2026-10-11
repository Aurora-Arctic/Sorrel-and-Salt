import type { Story } from '@ladle/react';
import type { Route } from 'next';
import { useState } from 'react';
import { listHref } from '../../lib/list-href';
import FilterForm from '.';

// Render-only; the lists that use it assert their filters. The workshop's
// router goes nowhere, so Filter shows its spinner only for as long as the
// stubbed push takes. The fields are the caller's: a name and a group here, as
// a value list's are, with Filter offered once either differs from the
// filter shown.
export default {
  title: 'Forms / Filter Form',
};

const PATH = '/admin/categories' as Route;

const ValueFilter = () => {
  const shown = { query: '', group: '' };
  const [query, setQuery] = useState(shown.query);
  const [group, setGroup] = useState(shown.group);
  return (
    <FilterForm
      label="Filter Categories"
      action={PATH}
      href={() => listHref(PATH, { query: query.trim(), group })}
      disabled={query.trim() === shown.query && group === shown.group}
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
  );
};

// Type in Name, or pick a group, to offer Filter.
export const Default: Story = () => <ValueFilter />;

export const PhoneDark: Story = () => <ValueFilter />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <ValueFilter />;
PhoneLight.meta = { theme: 'light', width: 375 };
