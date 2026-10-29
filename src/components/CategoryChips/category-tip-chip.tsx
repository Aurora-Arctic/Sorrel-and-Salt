'use client';

import { type ReactElement, useId } from 'react';
import { chipColors } from '../../lib/chip-colors';
import IconTip from '../IconTip/icon-tip';
import type { CardCategory } from './types';

// A category chip that carries a tip: a button, so focus and a tap reach it as well as hover; the
// bubble is decoration, so its words also ride on the button as its description. A client child so
// `CategoryChips` stays server-compatible (claude-docs/components/category-chips.md).
const CategoryTipChip = ({
  category,
  group,
  tip,
}: CardCategory & { tip: string }): ReactElement => {
  const tipId = useId();
  return (
    <IconTip tip={tip} placement="above" opensOnPress>
      <button
        type="button"
        className="chip category-chips__tip-chip"
        style={chipColors(group)}
        aria-describedby={tipId}
      >
        {category.name}
      </button>
      <span id={tipId} className="category-chips__tip-text">
        {tip}
      </span>
    </IconTip>
  );
};

export default CategoryTipChip;
