import type { ReactElement } from 'react';
import FormIcon from '../FormIcon';
import { chipColors } from '../../lib/chip-colors';
import type { GroupChipProps } from './types';

/**
 * A group's name in its own chip, as the category picker shows it, where the
 * group carries both colours; plain text otherwise, a tradition having none.
 * A form group's name leads with its icon, the generic where it has none:
 * `icon` is `undefined` for a group of another kind, which draws no icon.
 * A table's cell, the group list's and the value list's
 * (claude-docs/components/data-table.md).
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
