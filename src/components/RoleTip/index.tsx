import { useId, type ReactElement } from 'react';
import InfoTip from '../InfoTip';
import type { RoleTipProps } from './types';
import './index.scss';

// A role's name in a list's Role column with an ⓘ beside it that says what the role may do, in the
// words the Change Role control reads from the same constant, so the two never drift
// (claude-docs/components/role-tip.md).
const RoleTip = ({ label, description, emphasis = false }: RoleTipProps): ReactElement => {
  const id = useId();
  return (
    <span className="role-tip">
      {emphasis ? <strong>{label}</strong> : <span>{label}</span>}
      <InfoTip id={id} label={label}>
        {description}
      </InfoTip>
    </span>
  );
};

export default RoleTip;
