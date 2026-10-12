import type { ReactElement } from 'react';
import { chipColors } from '../../lib/chip-colors';
import type { GroupChipProps } from './types';

/**
 * A group's name in its own chip, as the category picker shows it, where the
 * group carries both colours; plain text otherwise, a form group or a
 * tradition having none. A table's cell, the group list's and the value
 * list's (claude-docs/components/data-table.md).
 */
const GroupChip = ({ name, colors }: GroupChipProps): ReactElement =>
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

export default GroupChip;
