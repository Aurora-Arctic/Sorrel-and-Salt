'use client';

import { autoUpdate, flip, offset, shift, size, useFloating } from '@floating-ui/react-dom';
import { type ReactElement, useCallback, useEffect, useId, useRef, useState } from 'react';
import { useDismiss } from '../../lib/use-dismiss';
import { chipColors } from '../../lib/chip-colors';
import { TIP_OPEN_DELAY_MS } from '../InfoTip/constants';
import CategoryTipChip from './category-tip-chip';
import { chipTip } from './chip-tip';
import type { CardCategory, CategoryChipsProps } from './types';

const PANEL_MIN_PX = 192;
const EDGE_PX = 8;

// The card's +N button and the panel behind it: a toggletip floating over the chip row, so the card's
// height never changes (WCAG 1.4.13). A client child so `IngredientCard` stays server-compatible
// (claude-docs/components/category-chips.md, "Contracts").

const GRACE_MS = 120;

interface CategoryMoreProps {
  categories: readonly CardCategory[];
  label: string;
  tipOf?: CategoryChipsProps['tipOf'];
}

const CategoryMore = ({ categories, label, tipOf }: CategoryMoreProps): ReactElement => {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const wrapper = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Set while Escape puts focus back on the button, which must not reopen the panel.
  const returning = useRef(false);
  const panelId = useId();
  const [row, setRow] = useState<HTMLElement | null>(null);

  const { refs, elements, floatingStyles, update } = useFloating({
    open,
    elements: { reference: row },
    placement: 'bottom-start',
    strategy: 'fixed',
    middleware: [
      offset(8),
      flip({ padding: EDGE_PX }),
      shift({ padding: EDGE_PX }),
      size({
        padding: EDGE_PX,
        // As wide as the row, or the least width, and never wider than the window.
        apply({ rects, elements: { floating } }) {
          floating.style.width = `${Math.max(rects.reference.width, PANEL_MIN_PX)}px`;
        },
      }),
    ],
  });
  const { floating } = elements;
  useEffect(() => {
    if (!open || !row || !floating) return;
    return autoUpdate(row, floating, update);
  }, [open, row, floating, update]);
  useEffect(() => {
    setRow(wrapper.current?.closest('ul') ?? null);
  }, []);

  const close = useCallback(() => {
    clearTimeout(timer.current);
    setPinned(false);
    setOpen(false);
  }, []);

  const show = () => {
    clearTimeout(timer.current);
    setOpen(true);
  };

  const showSoon = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(true), TIP_OPEN_DELAY_MS);
  };

  const closeSoon = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!wrapper.current?.matches(':focus-within')) setOpen(false);
    }, GRACE_MS);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  useDismiss({
    active: open,
    inside: (target) => wrapper.current?.contains(target) ?? false,
    onOutsidePress: close,
    onEscape: () => {
      close();
      returning.current = true;
      button.current?.focus();
      returning.current = false;
    },
  });

  return (
    <span
      ref={wrapper}
      className="category-more"
      onMouseEnter={showSoon}
      onMouseLeave={() => {
        if (!pinned) closeSoon();
      }}
      onFocus={() => {
        if (!returning.current) show();
      }}
      onBlur={(event) => {
        if (wrapper.current?.contains(event.relatedTarget as Node | null)) return;
        setPinned(false);
        closeSoon();
      }}
    >
      <button
        ref={button}
        type="button"
        className="category-more__button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${categories.length} more ${categories.length === 1 ? 'category' : 'categories'} for ${label}`}
        onClick={() => {
          if (pinned) close();
          else {
            setPinned(true);
            show();
          }
        }}
      >
        +{categories.length}
      </button>
      <span
        id={panelId}
        // oxlint-disable-next-line react/refs -- the callback ref and handlers come from a hook and are only handed to the DOM, never read while rendering
        ref={refs.setFloating}
        style={floatingStyles}
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a fieldset or details would add a legend or a disclosure; this is a plain labelled group
        role="group"
        aria-label={`More categories for ${label}`}
        aria-hidden={!open}
        className={open ? 'category-more__panel is-open' : 'category-more__panel'}
      >
        {categories.map((chip) => {
          const tip = chipTip(chip, tipOf);
          return tip !== undefined ? (
            <CategoryTipChip key={chip.category.id} {...chip} tip={tip} />
          ) : (
            <span key={chip.category.id} className="chip" style={chipColors(chip.group)}>
              {chip.category.name}
            </span>
          );
        })}
      </span>
    </span>
  );
};

export default CategoryMore;
