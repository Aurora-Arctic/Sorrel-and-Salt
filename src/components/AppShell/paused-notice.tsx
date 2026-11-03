import Link from 'next/link';
import type { ReactElement } from 'react';
import { ACCESS_PAUSED_PATH } from '../../lib/access-paused';
import LocalTime from '../LocalTime';
import Notice from '../Notice';
import type { PausedNoticeProps } from './types';

// A paused viewer's notice: a landmark of its own, as the page owns `main`. The shell draws it above every page, and a
// page whose text column the shell cannot line up with (an ingredient entry) draws it inside that column instead.
const PausedNotice = ({ until, className }: PausedNoticeProps): ReactElement => (
  <aside className={className} aria-label="Site Access">
    <Notice kind="error" quiet>
      Your site access is paused
      {until ? (
        <>
          {' '}
          until <LocalTime at={until} long />.
        </>
      ) : (
        ', with no end date.'
      )}{' '}
      <Link href={ACCESS_PAUSED_PATH}>What This Means</Link>
    </Notice>
  </aside>
);

export default PausedNotice;
