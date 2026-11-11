'use client';

import { type ReactElement, useCallback, useId, useRef, useState } from 'react';
import { chipColors } from '../../lib/chip-colors';
import TipAnchor from '../InfoTip/tip-anchor';
import CategoryTipChip from './category-tip-chip';
import { chipTip } from './chip-tip';
import type { CardCategory, CategoryChipsProps } from './types';
import { plural } from '@/lib/text';

const PANEL_MIN_PX = 192;
const PANEL_GAP_PX = 8;
const GRACE_MS = 120;

// The card's +N button and the panel behind it: a toggletip floating over the chip row, so the card's
// height never changes (WCAG 1.4.13). A client child so `IngredientCard` stays server-compatible
// (claude-docs/components/category-chips.md, "Contracts").

interface CategoryMoreProps {
  categories: readonly CardCategory[];
  label: string;
  tipOf?: CategoryChipsProps['tipOf'];
}

const CategoryMore = ({ categories, label, tipOf }: CategoryMoreProps): ReactElement => {
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  // The panel is as wide as the chip row, so it is placed against the row, not the +N button.
  const [row, setRow] = useState<HTMLElement | null>(null);
  const findRow = useCallback((node: HTMLElement | null) => {
    setRow(node?.closest('ul') ?? null);
  }, []);

  return (
    <TipAnchor
      className="category-more"
      bubbleClass="category-more__panel"
      bubbleId={panelId}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a fieldset or details would add a legend or a disclosure; this is a plain labelled group
      bubbleRole="group"
      bubbleProps={{ 'aria-label': `More categories for ${label}` }}
      anchorRef={findRow}
      reference={row}
      placement="bottom-start"
      gapPx={PANEL_GAP_PX}
      minWidthPx={PANEL_MIN_PX}
      closeDelayMs={GRACE_MS}
      pinnable
      returnFocusTo={button}
      bubble={categories.map((chip) => {
        const tip = chipTip(chip, tipOf);
        return tip !== undefined ? (
          <CategoryTipChip key={chip.category.id} {...chip} tip={tip} />
        ) : (
          <span key={chip.category.id} className="chip" style={chipColors(chip.group)}>
            {chip.category.name}
          </span>
        );
      })}
    >
      {({ open, toggle }) => (
        <button
          ref={button}
          type="button"
          className="category-more__button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`${categories.length} more ${plural(categories.length, 'category', 'categories')} for ${label}`}
          onClick={toggle}
        >
          +{categories.length}
        </button>
      )}
    </TipAnchor>
  );
};

export default CategoryMore;
