'use client';

import type { ReactElement } from 'react';
import MemberDetail from '../../../../../../components/MemberDetail';
import { RouteModal } from '../../../../../../components/Modal';
import type { MemberDialogProps } from './types';

// The members page's modal, opened by `?member=<id>` or at once by a press. The client edge between the server page
// and the body, as `RouteModal` takes a function a server component cannot pass. Always rendered, so a press's
// skeleton and the body replacing it are one dialog.
export default function MemberDialog({
  closeHref,
  opened,
  ...grants
}: MemberDialogProps): ReactElement {
  return (
    <RouteModal
      closeHref={closeHref}
      content={
        opened && {
          heading: opened.heading,
          body: (done) => (
            <MemberDetail
              key={opened.member.userId}
              member={opened.member}
              onRemoved={done}
              {...grants}
            />
          ),
        }
      }
    />
  );
}
