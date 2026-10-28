'use client';

import { type ReactElement, useId } from 'react';
import { chipColors } from '../../lib/chip-colors';
import IconTip from '../IconTip/icon-tip';
import type { CardCategory } from './types';

// A category chip that carries a tip, for a caller that has something to say about each
// chip (the spell builder's Category Match: what each category is from). The
// chip is a button so its tip is reached by focus and by a tap as well as by hover (the
// M12.43 rule: never hover alone). The bubble is decoration, as IconTip's is, so the same
// words ride on the button as its description for a screen reader. A client child of its
// own so `CategoryChips` stays server-compatible. claude-docs/components/category-chips.md.
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
