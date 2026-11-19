import { type ReactElement, useId } from 'react';
import { cx } from '@/lib/class-names';
import type { CardSectionProps, ValueCardProps } from './types';

function CardSection({ label, items, chips = false }: CardSectionProps): ReactElement {
  const labelId = useId();
  return (
    <span className="ingredient-entry__card-section">
      <span id={labelId} className="ingredient-entry__card-label">
        {label}
      </span>
      <span
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the card is a span, so its lists are phrasing content, which a ul is not
        role="list"
        aria-labelledby={labelId}
        className={cx('ingredient-entry__card-list', chips && 'ingredient-entry__card-list--chips')}
      >
        {items.map((item, index) => (
          <span
            key={`${index}-${item}`}
            // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the card is a span, so its lists are phrasing content, which an li is not
            role="listitem"
            className={chips ? 'ingredient-entry__card-chip' : 'ingredient-entry__card-item'}
          >
            {item}
          </span>
        ))}
      </span>
    </span>
  );
}

/** A value's card: a deity's tradition over its name, its other names, and the ingredients that gave the value. */
const ValueCard = ({
  title,
  tradition,
  otherNames = [],
  sources = [],
}: ValueCardProps): ReactElement => (
  <>
    {tradition && <span className="eyebrow ingredient-entry__card-eyebrow">{tradition}</span>}
    <strong className="ingredient-entry__card-title">{title}</strong>
    {otherNames.length > 0 && <CardSection label="Also Called" items={otherNames} chips />}
    {sources.length > 0 && <CardSection label="Given By" items={sources} />}
  </>
);

export default ValueCard;
