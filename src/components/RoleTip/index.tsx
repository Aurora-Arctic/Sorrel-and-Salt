import { useId, type ReactElement } from 'react';
import InfoTip from '../InfoTip';
import type { RoleTipProps } from './types';
import './index.scss';

// Reads its description from the same constant as Change Role, so the two never drift (claude-docs/components/role-tip.md).
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
