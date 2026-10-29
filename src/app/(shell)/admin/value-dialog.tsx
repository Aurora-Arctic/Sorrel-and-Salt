'use client';

import type { ReactElement } from 'react';
import GroupedValueForm from '../../../components/GroupedValueForm';
import { RouteModal } from '../../../components/Modal';
import type { ValueDialogProps } from './types';

// A curated value page's modal, opened by its address or at once by a press. The client edge
// between the server page and the form, as `RouteModal` hands its contents the modal's close as a
// function a server component cannot pass. Rendered whatever the address opens, so a press's
// skeleton and the form that replaces it are one dialog.
export default function ValueDialog({
  kind,
  closeHref,
  opened,
  groups,
}: ValueDialogProps): ReactElement {
  return (
    <RouteModal
      closeHref={closeHref}
      content={
        opened && {
          heading: opened.heading,
          body: (done) => (
            <GroupedValueForm
              // A fresh form per value: one opened after another starts from its own values.
              key={opened.value?.id ?? 'new'}
              kind={kind}
              value={opened.value}
              groups={groups}
              onDone={done}
            />
          ),
        }
      }
    />
  );
}
