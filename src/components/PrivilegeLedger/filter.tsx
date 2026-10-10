'use client';

import { type FormEvent, type ReactElement, useState } from 'react';
import { privilegeLedgerHref } from './href';
import type { LedgerPrivilege, PrivilegeLedgerFilterProps } from './types';

// The filter, a GET form to the page itself, as the user list's is (MB.52,
// MB.53): part of the subject's name or email, and a native privilege
// `<select>`, so before hydration the form submits natively, "All" as
// `privilege=`, which the page reads as no privilege. Filter is offered
// only when the form differs from the filter the page shows, and opens the
// new filter from the first page as a full load, as the pager's plain
// anchors do.
const PrivilegeLedgerFilter = ({ filter }: PrivilegeLedgerFilterProps): ReactElement => {
  const query = filter.query ?? '';
  const [draftQuery, setDraftQuery] = useState(query);
  const [draft, setDraft] = useState<LedgerPrivilege | ''>(filter.privilege ?? '');
  const changed = draftQuery.trim() !== query || draft !== (filter.privilege ?? '');

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!changed) return;
    window.location.assign(
      privilegeLedgerHref({
        query: draftQuery.trim(),
        privilege: draft || undefined,
      }),
    );
  }

  return (
    <search>
      <form
        className="privilege-ledger__search"
        method="get"
        action="/admin/privilege-changes"
        aria-label="Filter privilege changes"
        onSubmit={apply}
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
        {/* `disabled`, not `aria-disabled`: a submit with nothing to send. */}
        <button className="btn btn--solid" type="submit" disabled={!changed}>
          Filter
        </button>
      </form>
    </search>
  );
};

export default PrivilegeLedgerFilter;
