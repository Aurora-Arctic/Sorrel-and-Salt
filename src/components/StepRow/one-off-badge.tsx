'use client';

import { type ReactElement, useId } from 'react';
import IconTip from '../IconTip';

// A one-off ingredient's One-Off badge with its tip, "Used in this spell only; not kept in your
// cupboard." (the owner, 2026-10-29): a button, so the tip is reached by focus as well as hover,
// named One-Off with the sentence as its description, since IconTip's bubble is drawn only and
// never read. One component for the recipe and the builder, so the two say the same thing.

export const ONE_OFF_TIP = 'Used in this spell only; not kept in your cupboard.';

export default function OneOffBadge({ className }: { className?: string }): ReactElement {
  const descriptionId = useId();
  return (
    <IconTip tip={ONE_OFF_TIP} placement="above" opensOnPress>
      <button
        type="button"
        className={['badge badge--local step-row__one-off', className].filter(Boolean).join(' ')}
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
