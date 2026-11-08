'use client';

import { type ReactElement, useState } from 'react';
import { FilterSelectField, SearchField } from '../Field';
import { ChoiceChip } from '../FacetPanel/choice-chip';
import FilterForm, { useApplyFilter } from '../FilterForm';
import { KEEPERS_HELP, keepersHelpHref } from './href';
import type {
  HelpOutlineAudience,
  HelpOutlineFilter,
  HelpOutlineKind,
  HelpOutlineShown,
} from './types';

// The help list's filter on the shared FilterForm: Kind, Audience and Shown apply as they change, the search on the
// magnifier or Enter. Each change opens the first guide again, as a filter opens a list at its first page.

const KIND_OPTIONS: readonly { value: HelpOutlineKind | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'article', label: 'Articles' },
  { value: 'faq', label: 'FAQ' },
  { value: 'term', label: 'Terms' },
];

const AUDIENCE_OPTIONS: readonly { value: HelpOutlineAudience; label: string }[] = [
  { value: 'public', label: 'Public' },
  { value: 'staff', label: 'Staff' },
  { value: 'keeper', label: 'Keeper' },
];

// Shown is the default, so it is the empty choice and leaves the address bare.
const SHOWN_OPTIONS: readonly { value: Exclude<HelpOutlineShown, 'shown'>; label: string }[] = [
  { value: 'hidden', label: 'Hidden' },
  { value: 'all', label: 'All' },
];

const HelpOutlineFilterRow = ({ filter }: { filter: HelpOutlineFilter }): ReactElement => {
  const [query, setQuery] = useState(filter.query);
  const apply = useApplyFilter();
  const next = (change: Partial<HelpOutlineFilter>) =>
    keepersHelpHref({ ...filter, query, ...change });

  return (
    <FilterForm
      label="Filter Help"
      action={KEEPERS_HELP}
      searchHref={() => next({})}
      shown={[
        filter.query,
        filter.kind,
        filter.audience,
        filter.shown === 'shown' ? '' : filter.shown,
      ]}
    >
      <SearchField
        label="Search Help"
        name="q"
        placeholder="Title or body"
        value={query}
        onChange={setQuery}
      />
      <ChoiceChip
        legend="Kind"
        name="kind"
        options={KIND_OPTIONS}
        value={filter.kind}
        onChange={(kind) => apply(next({ kind }))}
      />
      <FilterSelectField
        label="Audience"
        name="audience"
        all="All"
        options={AUDIENCE_OPTIONS}
        defaultValue={filter.audience}
        fit
        onChange={(audience) => apply(next({ audience: audience as HelpOutlineAudience | '' }))}
      />
      <FilterSelectField
        label="Shown"
        name="shown"
        all="Shown"
        options={SHOWN_OPTIONS}
        defaultValue={filter.shown === 'shown' ? '' : filter.shown}
        fit
        onChange={(shown) => apply(next({ shown: (shown || 'shown') as HelpOutlineShown }))}
      />
    </FilterForm>
  );
};

export default HelpOutlineFilterRow;
