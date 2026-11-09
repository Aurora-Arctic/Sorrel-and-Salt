'use client';

import { type ReactElement, useState } from 'react';
import { oneOf } from '../../lib/search-params';
import { FilterSelectField } from '../Field/filter-select-field';
import { SearchField } from '../Field/search-field';
import FilterForm, { useApplyFilter } from '../FilterForm';
import { PRIVILEGE_CHANGES_PATH, privilegeLedgerHref } from './href';
import { PRIVILEGES, PRIVILEGE_LABELS } from './privileges';
import type { PrivilegeLedgerFilter, PrivilegeLedgerFilterProps } from './types';

// The ledger's filter, in the shared `FilterForm`: the search is held until the magnifier or Enter, the Privilege
// dropdown applies as picked. Before hydration the native select submits "All Privileges" as `privilege=`, read as none.
const PrivilegeLedgerFilter = ({ filter }: PrivilegeLedgerFilterProps): ReactElement => {
  const query = filter.query ?? '';
  const [draftQuery, setDraftQuery] = useState(query);
  const apply = useApplyFilter();
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
