import type { Story } from '@ladle/react';
import type { Route } from 'next';
import { type ReactElement, useId, useState } from 'react';
import { listHref } from '../../lib/list-href';
import { FieldShell, SearchField, SwitchField, fieldDescription } from '../Field';
import ListFrame from '../ListFrame';
import FilterForm, { useApplyFilter } from '.';

// Render-only; the lists that use it assert their filters. A filter sits in
// its list's ListFrame, which holds its navigation; the workshop's router
// goes nowhere, so a change shows nothing on its way here (GroupedValueList's
// `Pending` stories draw that). The fields are the caller's: a name search,
// a group and an on-or-off flag here, as a value list's are. The search
// applies from its magnifier or Enter, the group and the flag on their
// change, and Clear is drawn only while the page shows a filter.
export default {
  title: 'Forms / Filter Form',
};

const PATH = '/admin/categories' as Route;

interface Shown {
  query: string;
  group: string;
  unsourced: boolean;
}

const NO_FILTER: Shown = { query: '', group: '', unsourced: false };

const ValueFilter = ({ shown }: { shown: Shown }): ReactElement => {
  const apply = useApplyFilter();
  const group = fieldDescription({ id: `${useId()}-group` });
  const [query, setQuery] = useState(shown.query);
  // The filter shown, with the search's text typed but not yet sent, so a
  // change of group or flag carries it too.
  const href = (change: Partial<Shown>) =>
    listHref(PATH, { ...shown, query: query.trim(), ...change });
  return (
    <FilterForm
      label="Filter Categories"
      action={PATH}
      searchHref={() => href({})}
      shown={[shown.query, shown.group, shown.unsourced]}
    >
      <SearchField
        label="Name"
        name="query"
        placeholder="Search names"
        value={query}
        onChange={setQuery}
      />
      <FieldShell label="Group" {...group}>
        <select
          id={group.controlId}
          className="select"
          name="group"
          defaultValue={shown.group}
          onChange={(event) => apply(href({ group: event.target.value }))}
        >
          <option value="">All Groups</option>
          <option value="fixture-substance">Fixture Substance</option>
          <option value="testwort-wards">Testwort Wards</option>
        </select>
      </FieldShell>
      <SwitchField
        label="No Refs"
        name="unsourced"
        value="1"
        defaultChecked={shown.unsourced}
        onChange={(unsourced) => apply(href({ unsourced }))}
      />
    </FilterForm>
  );
};

const Framed = ({ shown = NO_FILTER }: { shown?: Shown }) => (
  <ListFrame>
    <ValueFilter shown={shown} />
  </ListFrame>
);

// A page showing no filter: nothing to clear, so no Clear.
export const Default: Story = () => <Framed />;

export const PhoneDark: Story = () => <Framed />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <Framed />;
PhoneLight.meta = { theme: 'light', width: 375 };

// A page showing a filter: Clear, a link to the page itself, ends the row.
const FILTER: Shown = { query: 'test', group: 'testwort-wards', unsourced: true };

export const Filtered: Story = () => <Framed shown={FILTER} />;

export const FilteredPhoneDark: Story = () => <Framed shown={FILTER} />;
FilteredPhoneDark.meta = { theme: 'dark', width: 375 };

export const FilteredPhoneLight: Story = () => <Framed shown={FILTER} />;
FilteredPhoneLight.meta = { theme: 'light', width: 375 };
