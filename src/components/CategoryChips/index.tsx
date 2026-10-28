import type { ReactElement } from 'react';
import { chipColors } from '../../lib/chip-colors';
import CategoryMore from './category-more';
import { CATEGORY_CHIP_LIMIT } from './constants';
import type { CategoryChipsProps } from './types';
import './index.scss';

// An entry's categories as a row of full chips: the first few, then a +N button holding
// the rest in a panel that floats over the page. Shared by the ingredient card and the
// admin Compendium table, so the two draw and behave alike. Chips are plain text, not
// links or toggles. claude-docs/components/category-chips.md.
const CategoryChips = ({
  categories,
  label,
  compact = false,
  showAll = false,
}: CategoryChipsProps): ReactElement | null => {
  if (categories.length === 0) return null;
  const limit = showAll ? categories.length : CATEGORY_CHIP_LIMIT;
  return (
    <ul
      className={
        compact
          ? 'specimen__chips category-chips category-chips--compact'
          : 'specimen__chips category-chips'
      }
      aria-label="Categories"
    >
      {categories.slice(0, limit).map(({ category, group }) => (
        <li key={category.id}>
          <span className="chip" style={chipColors(group)}>
            {category.name}
          </span>
        </li>
      ))}
      {categories.length > limit && (
        <li className="category-more-item">
          <CategoryMore categories={categories.slice(limit)} label={label} />
        </li>
      )}
    </ul>
  );
};

export default CategoryChips;
export { CATEGORY_CHIP_LIMIT } from './constants';
export type { CardCategory, CategoryChipsProps } from './types';
