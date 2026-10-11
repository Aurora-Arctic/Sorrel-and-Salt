import type { ReactElement } from 'react';
import type { NoticeKind, NoticeProps } from './types';

// The `.notice` primitive with the role its kind implies, in one place: a
// message that arrives after the page did is announced only because of its
// role, so the role travels with the look rather than being remembered at
// each of the twenty-odd call sites that wrote the markup by hand.
// claude-docs/components/notice.md.

const MODIFIER: Record<NoticeKind, string> = {
  error: 'notice notice--error',
  warn: 'notice notice--warn',
  success: 'notice notice--success',
  plain: 'notice',
};

const Notice = ({ kind, id, className, children }: NoticeProps): ReactElement => {
  const classes = className ? `${MODIFIER[kind]} ${className}` : MODIFIER[kind];

  if (kind === 'success') {
    // `output` carries the status role itself, so it takes no `role`.
    return (
      <output id={id} className={classes}>
        {children}
      </output>
    );
  }

  return (
    <p id={id} className={classes} role={kind === 'plain' ? undefined : 'alert'}>
      {children}
    </p>
  );
};

export default Notice;
