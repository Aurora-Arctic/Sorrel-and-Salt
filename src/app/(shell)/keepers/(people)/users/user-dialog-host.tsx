import type { ReactElement } from 'react';
import { impersonationEnabled } from '@/lib/impersonation';
import { changesLocked } from '@/components/UserList/lock';
import UserDialog from './user-dialog';
import type { UserDialogHostProps } from './types';

// The user dialog as every keepers page that opens one draws it, with the impersonation and
// paused-changes rules it carries, so a change to either is made here.
export default function UserDialogHost({
  closeHref,
  opened,
  adminChanges,
  place,
}: UserDialogHostProps): ReactElement {
  return (
    <UserDialog
      place={place}
      closeHref={closeHref}
      opened={opened}
      canImpersonate={impersonationEnabled()}
      changesPaused={Boolean(adminChanges && changesLocked(adminChanges))}
    />
  );
}
