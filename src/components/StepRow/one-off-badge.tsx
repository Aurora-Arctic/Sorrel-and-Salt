'use client';

import { type ReactElement, useId } from 'react';
import IconTip from '../IconTip';
import { cx } from '@/lib/class-names';

// A one-off ingredient's badge with its tip: a button, so the tip is reached by focus as well as hover, and named
// One-Off with the sentence as its description, since IconTip's bubble is never read.

const ONE_OFF_TIP = 'Used in this spell only; not kept in your cupboard.';

export default function OneOffBadge({ className }: { className?: string }): ReactElement {
  const descriptionId = useId();
  return (
    <IconTip tip={ONE_OFF_TIP} placement="above" opensOnPress>
      <button
        type="button"
        className={cx('badge badge--muted step-row__one-off', className)}
        aria-describedby={descriptionId}
      >
        One-Off
      </button>
      <span id={descriptionId} className="visually-hidden">
        {ONE_OFF_TIP}
      </span>
    </IconTip>
  );
}
