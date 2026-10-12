'use client';

import { type ReactElement, useState } from 'react';
import { SearchField, SwitchField } from '../Field';
import FilterForm, { useApplyFilter } from '../FilterForm';
import { userListHref } from './href';
import type { UserRole } from '../../lib/session';
import type { UserListFilterProps } from './types';

// The user list's filter (MB.52, MB.115), in the shared `FilterForm`. Only
// the search text is held here, until the magnifier or Enter sends it. The
// role select and the Needs Approval switch are uncontrolled and apply the
// moment they change, softly and from the first page, carrying the search
// text along, so there is no Filter button to press. Before hydration the
// form submits natively: the switch, a native checkbox, as `awaiting=`, which
// the page reads the same as the bare flag, and the role select, whose "All
// Roles" is `role=`, which the page reads as no role.
const UserListFilter = ({ query, awaitingApproval, role }: UserListFilterProps): ReactElement => {
  const [draftQuery, setDraftQuery] = useState(query);
  const apply = useApplyFilter();
  const applying = (change: { awaitingApproval?: boolean; role?: UserRole | undefined }) =>
    apply(
      userListHref({
        query: draftQuery.trim(),
        awaitingApproval,
        role,
        ...change,
      }),
    );

  return (
    <FilterForm
      label="Filter Users"
      action="/admin/users"
      searchHref={() => userListHref({ query: draftQuery.trim(), awaitingApproval, role })}
      shown={[query, role, awaitingApproval]}
    >
      <SearchField
        label="Name or Email"
        name="query"
        placeholder="Search users"
        value={draftQuery}
        onChange={setDraftQuery}
      />
      <div className="field">
        <label className="field__label" htmlFor="user-list-role">
          Role
        </label>
        <select
          id="user-list-role"
          className="select"
          name="role"
          defaultValue={role ?? ''}
          onChange={(event) => applying({ role: (event.target.value || undefined) as UserRole })}
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
      </div>
      <SwitchField
        label="Needs Approval"
        name="awaiting"
        value=""
        defaultChecked={awaitingApproval}
        onChange={(checked) => applying({ awaitingApproval: checked })}
      />
    </FilterForm>
  );
};

export default UserListFilter;
