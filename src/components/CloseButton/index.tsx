import type { ReactElement } from 'react';
import { cx } from '@/lib/class-names';

// The round × that closes a dialog or a sheet: its drawing and focus ring here, its place in the
// header from the one that uses it (`className`).
export default function CloseButton({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}): ReactElement {
  return (
    <button
      type="button"
      className={cx('close-button', className)}
      aria-label="Close"
      onClick={onClick}
    >
      <span aria-hidden="true">×</span>
    </button>
  );
}
