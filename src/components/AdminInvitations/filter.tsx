'use client';

import { type ReactElement, useState } from 'react';
import { SearchField, SwitchField } from '../Field';
import FilterForm, { useApplyFilter } from '../FilterForm';
import { invitationsHref } from './href';
import type { AdminInvitationsFilterProps } from './types';

// The Invitations tab's filter (MB.115, on the owner's ask: "search the
// Invitations by email and expires in 24 hrs"), on the shared FilterForm as
// the user list's is. Only the email text is held here, until the magnifier
// or Enter sends it; the Expires in 24 Hrs switch is uncontrolled and applies
// the moment it changes, carrying the email along. Both open the first page
// softly, since the admin layout's guard runs on every page under /admin, and
// there is no Filter button. Before hydration the form submits natively, the
// email as `email=` and the switch, a native checkbox, as `expiring=`, which
// the page reads the same as the bare flag. The list keys this by the filter
// shown, so a page showing another starts it again from that one.
const AdminInvitationsFilter = ({ filter }: AdminInvitationsFilterProps): ReactElement => {
  const [draftEmail, setDraftEmail] = useState(filter.email);
  const apply = useApplyFilter();

  return (
    <FilterForm
      label="Filter Invitations"
      action="/admin/invitations"
      searchHref={() =>
        invitationsHref({ email: draftEmail.trim(), expiringSoon: filter.expiringSoon })
      }
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
        onChange={(checked) =>
          apply(invitationsHref({ email: draftEmail.trim(), expiringSoon: checked }))
        }
      />
    </FilterForm>
  );
};

export default AdminInvitationsFilter;
