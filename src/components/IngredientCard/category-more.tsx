'use client';

import { type ReactElement, useCallback, useEffect, useId, useRef, useState } from 'react';
import { chipColors } from '../../lib/chip-colors';
import type { CardCategory } from './types';

// The card's +N button and the panel of categories behind it: a toggletip, so the card's
// height never changes (the panel floats over the chip row). Hover and focus open it; a
// click pins it, and a second click closes it. Escape closes it and returns focus to the
// button; a press outside or leaving (after a short grace, so the pointer can cross into
// the panel) closes it too: WCAG 1.4.13, dismissible, hoverable and persistent. A client
// child of its own so `IngredientCard` stays server-compatible.
// claude-docs/components/ingredient-card.md.

const GRACE_MS = 120;

interface CategoryMoreProps {
  /** The categories past the card's limit. */
  categories: readonly CardCategory[];
  /** The ingredient's label, for the accessible names. */
  label: string;
}

const CategoryMore = ({ categories, label }: CategoryMoreProps): ReactElement => {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const wrapper = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Set while Escape puts focus back on the button, which must not reopen the panel.
  const returning = useRef(false);
  const panelId = useId();

  const close = useCallback(() => {
    clearTimeout(timer.current);
    setPinned(false);
    setOpen(false);
  }, []);

  const show = () => {
    clearTimeout(timer.current);
    setOpen(true);
  };

  const closeSoon = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!wrapper.current?.matches(':focus-within')) setOpen(false);
    }, GRACE_MS);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      close();
      returning.current = true;
      button.current?.focus();
      returning.current = false;
    };
    const onPress = (event: Event) => {
      if (!wrapper.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPress);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPress);
    };
  }, [open, close]);

  return (
    <span
      ref={wrapper}
      className="category-more"
      onMouseEnter={show}
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
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a fieldset or details would add a legend or a disclosure; this is a plain labelled group
        role="group"
        aria-label={`More categories for ${label}`}
        aria-hidden={!open}
        className={open ? 'category-more__panel is-open' : 'category-more__panel'}
      >
        {categories.map(({ category, group }) => (
          <span key={category.id} className="chip" style={chipColors(group)}>
            {category.name}
          </span>
        ))}
      </span>
    </span>
  );
};

export default CategoryMore;
