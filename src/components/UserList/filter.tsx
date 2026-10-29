'use client';

import { type ReactElement, useState } from 'react';
import { oneOf } from '../../lib/search-params';
import { FilterSelectField, SearchField, SwitchField } from '../Field';
import FilterForm, { useApplyFilter } from '../FilterForm';
import { USERS_PATH, userListHref } from './href';
import { ROLES, ROLE_LABELS } from './roles';
import type { UserListFilterProps, UserListFilterValue } from './types';

// The user list's filter in `FilterForm`: search text is sent by the magnifier or Enter; Role and Needs Approval apply on change
// (claude-docs/components/user-list.md, "Notes from code comments: the filter").
const UserListFilter = ({ query, awaitingApproval, role }: UserListFilterProps): ReactElement => {
  const [draftQuery, setDraftQuery] = useState(query);
  const apply = useApplyFilter();
  /** The filter shown with one field changed, the search text typed carried, from the first page. */
  const hrefWith = (change: Partial<UserListFilterValue>) =>
    userListHref({ query: draftQuery.trim(), awaitingApproval, role, ...change });

  return (
    <FilterForm
      label="Filter Users"
      action={USERS_PATH}
      searchHref={() => hrefWith({})}
      shown={[query, role, awaitingApproval]}
    >
      <SearchField
        label="Name or Email"
        name="query"
        placeholder="Search users"
        value={draftQuery}
        onChange={setDraftQuery}
      />
      <FilterSelectField
        label="Role"
        name="role"
        all="All Roles"
        options={ROLE_LABELS}
        defaultValue={role ?? ''}
        onChange={(chosen) => apply(hrefWith({ role: oneOf(ROLES, chosen) }))}
      />
      <SwitchField
        label="Needs Approval"
        name="awaiting"
        value=""
        defaultChecked={awaitingApproval}
        onChange={(checked) => apply(hrefWith({ awaitingApproval: checked }))}
      />
    </FilterForm>
  );
};

export default UserListFilter;
