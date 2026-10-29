'use client';

import { type ReactElement, useState } from 'react';
import { oneOf } from '../../lib/search-params';
import { FilterSelectField, SearchField } from '../Field';
import FilterForm, { useApplyFilter } from '../FilterForm';
import { PRIVILEGE_CHANGES_PATH, privilegeLedgerHref } from './href';
import { PRIVILEGES, PRIVILEGE_LABELS } from './privileges';
import type { PrivilegeLedgerFilter, PrivilegeLedgerFilterProps } from './types';

// The ledger's filter, in the shared `FilterForm`: the search text (part of the subject's name or
// email) is held until the magnifier or Enter sends it. The Privilege dropdown applies as a choice
// is picked, softly and from the first page, carrying the search along; before hydration the native
// select submits, "All Privileges" as `privilege=`, read as no privilege.
const PrivilegeLedgerFilter = ({ filter }: PrivilegeLedgerFilterProps): ReactElement => {
  const query = filter.query ?? '';
  const [draftQuery, setDraftQuery] = useState(query);
  const apply = useApplyFilter();
  /** The filter shown with the privilege given, the search text typed carried, from the first page. */
  const hrefWith = (privilege: PrivilegeLedgerFilter['privilege']) =>
    privilegeLedgerHref({ query: draftQuery.trim(), privilege });

  return (
    <FilterForm
      label="Filter Privilege Changes"
      action={PRIVILEGE_CHANGES_PATH}
      searchHref={() => hrefWith(filter.privilege)}
      shown={[filter.query, filter.privilege]}
    >
      <SearchField
        label="Name or Email"
        name="query"
        placeholder="Search users"
        value={draftQuery}
        onChange={setDraftQuery}
      />
      <FilterSelectField
        label="Privilege"
        name="privilege"
        all="All Privileges"
        options={PRIVILEGE_LABELS}
        defaultValue={filter.privilege ?? ''}
        onChange={(chosen) => apply(hrefWith(oneOf(PRIVILEGES, chosen)))}
      />
    </FilterForm>
  );
};

export default PrivilegeLedgerFilter;
