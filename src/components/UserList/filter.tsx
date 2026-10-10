'use client';

import { type FormEvent, type ReactElement, useState } from 'react';
import { userListHref } from './href';
import type { UserRole } from '../../lib/session';
import type { UserListFilterProps } from './types';

// The filter, a GET form to the page itself (MB.52). Filter is offered only
// when the form differs from the filter the page shows (MB.53, on the owner's
// word), and opens the new filter as a full load from the first page, as the
// pager's plain anchors do. Before hydration the form submits natively, its
// checkbox as `awaiting=`, which the page reads the same as the bare flag.
// The role is a native `<select>`, so it submits before hydration too, its
// "All roles" as `role=`, which the page reads as no role.
const UserListFilter = ({ query, awaitingApproval, role }: UserListFilterProps): ReactElement => {
  const [draftQuery, setDraftQuery] = useState(query);
  const [draftAwaiting, setDraftAwaiting] = useState(awaitingApproval);
  const [draftRole, setDraftRole] = useState<UserRole | ''>(role ?? '');
  const changed =
    draftQuery.trim() !== query || draftAwaiting !== awaitingApproval || draftRole !== (role ?? '');

  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!changed) return;
    window.location.assign(
      userListHref({
        query: draftQuery.trim(),
        awaitingApproval: draftAwaiting,
        role: draftRole || undefined,
      }),
    );
  }

  return (
    <search>
      <form
        className="user-list__search"
        method="get"
        action="/admin/users"
        aria-label="Filter users"
        onSubmit={filter}
      >
        <div className="field">
          <label className="field__label" htmlFor="user-list-query">
            Name or Email
          </label>
          <input
            id="user-list-query"
            className="input"
            type="search"
            name="query"
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="user-list-role">
            Role
          </label>
          <select
            id="user-list-role"
            className="select"
            name="role"
            value={draftRole}
            onChange={(event) => setDraftRole(event.target.value as UserRole | '')}
          >
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            name="awaiting"
            value=""
            checked={draftAwaiting}
            onChange={(event) => setDraftAwaiting(event.target.checked)}
          />
          Needs Approval
        </label>
        {/* `disabled`, not `aria-disabled`: a submit with nothing to send. */}
        <button className="btn btn--solid" type="submit" disabled={!changed}>
          Filter
        </button>
      </form>
    </search>
  );
};

export default UserListFilter;
