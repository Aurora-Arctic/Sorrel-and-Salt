'use client';

import { type ReactElement, useState } from 'react';
import FilterForm from '../FilterForm';
import { userListHref } from './href';
import type { UserRole } from '../../lib/session';
import type { UserListFilterProps } from './types';

// The filter's fields (MB.52), in the shared `FilterForm`, which offers
// Filter only when they differ from the filter the page shows (MB.53, on the
// owner's word) and opens the new filter as a full load from the first page,
// as the pager's plain anchors do, busy until the page goes. Before hydration
// the form submits natively, its checkbox as `awaiting=`, which the page
// reads the same as the bare flag. The role is a native `<select>`, so it
// submits before hydration too, its "All Roles" as `role=`, which the page
// reads as no role.
const UserListFilter = ({ query, awaitingApproval, role }: UserListFilterProps): ReactElement => {
  const [draftQuery, setDraftQuery] = useState(query);
  const [draftAwaiting, setDraftAwaiting] = useState(awaitingApproval);
  const [draftRole, setDraftRole] = useState<UserRole | ''>(role ?? '');
  const changed =
    draftQuery.trim() !== query || draftAwaiting !== awaitingApproval || draftRole !== (role ?? '');

  return (
    <FilterForm
      label="Filter Users"
      action="/admin/users"
      href={() =>
        userListHref({
          query: draftQuery.trim(),
          awaitingApproval: draftAwaiting,
          role: draftRole || undefined,
        })
      }
      disabled={!changed}
      shown={[query, role, awaitingApproval]}
      draft={[draftQuery, draftRole, draftAwaiting]}
      onClear={() => {
        setDraftQuery('');
        setDraftRole('');
        setDraftAwaiting(false);
      }}
      navigation="full"
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
          placeholder="Search users"
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
          <option value="">All Roles</option>
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
    </FilterForm>
  );
};

export default UserListFilter;
