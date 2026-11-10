import type { ReactElement, ReactNode } from 'react';
import IconTip from '../IconTip';

/** An icon that names a state; a button only so the keyboard reaches its tip, which a press also opens. */
const StatusMark = ({
  name,
  icon,
  className = 'support-requests__mark',
}: {
  name: string;
  icon: ReactNode;
  className?: string;
}): ReactElement => (
  <IconTip tip={name} opensOnPress>
    <button type="button" className={className} aria-label={name}>
      {icon}
    </button>
  </IconTip>
);

export default StatusMark;
