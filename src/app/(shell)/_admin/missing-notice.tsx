import type { ReactElement } from 'react';
import Notice from '@/components/Notice';
import type { MissingNoticeProps } from './types';

export default function MissingNotice({ noun }: MissingNoticeProps): ReactElement {
  return (
    <Notice kind="error">
      No {noun} has that address. It may have been renamed or deleted, so search for it in the list.
    </Notice>
  );
}
