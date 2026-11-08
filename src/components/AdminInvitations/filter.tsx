'use client';

import { type ReactElement, useState } from 'react';
import { SearchField } from '../Field/search-field';
import { SwitchField } from '../Field/switch-field';
import FilterForm, { useApplyFilter } from '../FilterForm';
import { INVITATIONS_PATH, invitationsHref } from './href';
import type { AdminInvitationsFilterProps } from './types';

// The Invitations tab's filter, on the shared FilterForm as the user list's is: the email is held until
// the magnifier or Enter sends it, the Expires in 24 Hrs switch applies as it changes, both opening the
// first page softly. Before hydration the form submits natively (`email=`, `expiring=`); the list keys this by the filter shown.
const AdminInvitationsFilter = ({ filter }: AdminInvitationsFilterProps): ReactElement => {
  const [draftEmail, setDraftEmail] = useState(filter.email);
  const apply = useApplyFilter();
  const hrefWith = (expiringSoon: boolean) =>
    invitationsHref({ email: draftEmail.trim(), expiringSoon });

  return (
    <FilterForm
      label="Filter Invitations"
      action={INVITATIONS_PATH}
      searchHref={() => hrefWith(filter.expiringSoon)}
      shown={[filter.email, filter.expiringSoon]}
    >
      <SearchField
        label="Email"
        name="email"
        placeholder="Search emails"
        value={draftEmail}
        onChange={setDraftEmail}
      />
      <SwitchField
        label="Expires in 24 Hrs"
        name="expiring"
        value=""
        defaultChecked={filter.expiringSoon}
        onChange={(checked) => apply(hrefWith(checked))}
      />
    </FilterForm>
  );
};

export default AdminInvitationsFilter;
