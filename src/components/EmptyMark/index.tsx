import type { ReactElement } from 'react';
import './index.scss';

// The one mark for a value that is missing: a dash, faded so a neighbouring unit or label reads first. It is an image named
// "None" so a screen reader says what the dash stands for while the drawn text stays the dash alone.
export default function EmptyMark(): ReactElement {
  return (
    <span className="empty-mark" role="img" aria-label="None">
      —
    </span>
  );
}
