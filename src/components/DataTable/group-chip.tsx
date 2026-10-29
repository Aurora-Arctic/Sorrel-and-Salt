import type { ReactElement } from 'react';
import FormIcon from '../FormIcon';
import { chipColors } from '../../lib/chip-colors';
import type { GroupChipProps } from './types';

/**
 * A group's name in a chip where it has both colours, plain text otherwise; a form group's name leads with its icon
 * (claude-docs/components/data-table.md, "The group chip").
 */
const GroupChip = ({ name, colors, icon }: GroupChipProps): ReactElement => {
  const label =
    colors?.colorDark && colors.colorLight ? (
      <span
        className="chip"
        style={chipColors({ colorDark: colors.colorDark, colorLight: colors.colorLight })}
      >
        {name}
      </span>
    ) : (
      <>{name}</>
    );
  return icon === undefined ? (
    label
  ) : (
    <>
      <FormIcon name={icon} /> {label}
    </>
  );
};

export default GroupChip;
