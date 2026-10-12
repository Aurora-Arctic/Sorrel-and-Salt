'use client';

import { type ReactElement, useState } from 'react';
import { SearchField } from '../Field';
import FilterForm, { useApplyFilter } from '../FilterForm';
import { privilegeLedgerHref } from './href';
import type { LedgerPrivilege, PrivilegeLedgerFilterProps } from './types';

// The ledger's filter (MB.52, MB.115), in the shared `FilterForm`, as the
// user list's is. Only the search text, part of the subject's name or email,
// is held here, until the magnifier or Enter sends it. The privilege select
// is uncontrolled and applies the moment it changes, softly and from the
// first page, carrying the search text along, so there is no Filter button.
// Before hydration the form submits natively, "All Privileges" as
// `privilege=`, which the page reads as no privilege.
const PrivilegeLedgerFilter = ({ filter }: PrivilegeLedgerFilterProps): ReactElement => {
  const query = filter.query ?? '';
  const [draftQuery, setDraftQuery] = useState(query);
  const apply = useApplyFilter();

  return (
    <FilterForm
      label="Filter Privilege Changes"
      action="/admin/privilege-changes"
      searchHref={() =>
        privilegeLedgerHref({ query: draftQuery.trim(), privilege: filter.privilege })
      }
      shown={[filter.query, filter.privilege]}
    >
      <SearchField
        label="Name or Email"
        name="query"
        placeholder="Search users"
        value={draftQuery}
        onChange={setDraftQuery}
      />
      <div className="field">
        <label className="field__label" htmlFor="privilege-ledger-privilege">
          Privilege
        </label>
        <select
          id="privilege-ledger-privilege"
          className="select"
          name="privilege"
          defaultValue={filter.privilege ?? ''}
          onChange={(event) =>
            apply(
              privilegeLedgerHref({
                query: draftQuery.trim(),
                privilege: (event.target.value || undefined) as LedgerPrivilege | undefined,
              }),
            )
          }
        >
          <option value="">All Privileges</option>
          <option value="admin">Admin</option>
          <option value="create_workspace">Coven Creation</option>
        </select>
      </div>
    </FilterForm>
  );
};

export default PrivilegeLedgerFilter;
