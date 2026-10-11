'use client';

import { type ReactElement, useState } from 'react';
import FilterForm from '../FilterForm';
import { privilegeLedgerHref } from './href';
import type { LedgerPrivilege, PrivilegeLedgerFilterProps } from './types';

// The filter's fields, in the shared `FilterForm`, as the user list's are
// (MB.52, MB.53): part of the subject's name or email, and a native privilege
// `<select>`, so before hydration the form submits natively, "All" as
// `privilege=`, which the page reads as no privilege. Filter is offered only
// when the fields differ from the filter the page shows, and opens the new
// filter from the first page as a full load, as the pager's plain anchors
// do, busy until the page goes.
const PrivilegeLedgerFilter = ({ filter }: PrivilegeLedgerFilterProps): ReactElement => {
  const query = filter.query ?? '';
  const [draftQuery, setDraftQuery] = useState(query);
  const [draft, setDraft] = useState<LedgerPrivilege | ''>(filter.privilege ?? '');
  const changed = draftQuery.trim() !== query || draft !== (filter.privilege ?? '');

  return (
    <FilterForm
      label="Filter privilege changes"
      action="/admin/privilege-changes"
      href={() => privilegeLedgerHref({ query: draftQuery.trim(), privilege: draft || undefined })}
      disabled={!changed}
      navigation="full"
    >
      <div className="field">
        <label className="field__label" htmlFor="privilege-ledger-query">
          Name or Email
        </label>
        <input
          id="privilege-ledger-query"
          className="input"
          type="search"
          name="query"
          value={draftQuery}
          onChange={(event) => setDraftQuery(event.target.value)}
        />
      </div>
      <div className="field">
        <label className="field__label" htmlFor="privilege-ledger-privilege">
          Privilege
        </label>
        <select
          id="privilege-ledger-privilege"
          className="select"
          name="privilege"
          value={draft}
          onChange={(event) => setDraft(event.target.value as LedgerPrivilege | '')}
        >
          <option value="">All</option>
          <option value="admin">Admin</option>
          <option value="create_workspace">Coven creation</option>
        </select>
      </div>
    </FilterForm>
  );
};

export default PrivilegeLedgerFilter;
