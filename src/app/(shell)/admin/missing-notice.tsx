import type { ReactElement } from 'react';
import Notice from '../../../components/Notice';
import type { MissingNoticeProps } from './types';

// What an admin list page says over its list when `?edit=` names no live row: a link followed
// after the row was renamed or deleted. An error notice rather than a 404, since the list beneath
// is still the page asked for.

/** "No category has that address…", for the row the page lists, in the singular. */
export default function MissingNotice({ noun }: MissingNoticeProps): ReactElement {
  return (
    <Notice kind="error">
      No {noun} has that address. It may have been renamed or deleted, so search for it in the list.
    </Notice>
  );
}
