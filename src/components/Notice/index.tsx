import type { ReactElement } from 'react';
import type { NoticeKind, NoticeProps } from './types';

// The `.notice` primitive with the role its kind implies: a message arriving after the page is
// announced only through its role, so the role travels with the look
// (claude-docs/components/notice.md).

const MODIFIER: Record<NoticeKind, string> = {
  error: 'notice notice--error',
  warn: 'notice notice--warn',
  caution: 'notice notice--caution',
  success: 'notice notice--success',
  plain: 'notice',
};

const Notice = ({
  kind,
  quiet = false,
  block = false,
  inRegion = false,
  id,
  className,
  children,
}: NoticeProps): ReactElement => {
  const classes = className ? `${MODIFIER[kind]} ${className}` : MODIFIER[kind];
  // A quiet error or warning is a status too: present from the start, found
  // by its role, and never announced over what the reader is doing.
  const status = kind === 'success' || (quiet && kind !== 'plain');
  // The region round it announces it, so a role of its own would say it twice.
  const role = inRegion || kind === 'plain' ? undefined : status ? 'status' : 'alert';

  if (block) {
    // A `<div>` with the role written out: a `<p>` cannot hold a list or a
    // button, nor an `<output>` anything but phrasing content.
    return (
      <div id={id} className={classes} role={role}>
        {children}
      </div>
    );
  }

  if (role === 'status') {
    // `output` carries the status role itself, so it takes no `role`.
    return (
      <output id={id} className={classes}>
        {children}
      </output>
    );
  }

  return (
    <p id={id} className={classes} role={role}>
      {children}
    </p>
  );
};

export default Notice;
