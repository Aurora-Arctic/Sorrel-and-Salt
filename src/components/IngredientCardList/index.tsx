'use client';

import { Children, useEffect, useRef, type ReactElement } from 'react';
import type { IngredientCardListProps } from './types';
import './index.scss';

// The grid of cards the public compendium, the coven's Ingredients page and its grimoire share, each in
// an `li`. Presentational: it decides nothing about what is listed and does not page
// (claude-docs/components/ingredient-card-list.md).
const IngredientCardList = ({
  label,
  density = 'regular',
  children,
}: IngredientCardListProps): ReactElement => {
  const list = useRef<HTMLUListElement>(null);

  // Cards below the window may skip layout (index.scss), marked at the page's first scroll, which is also the
  // browser's own restore on Back. By then every card has been laid out at its real height, and those above
  // or within the window are never marked: a stand-in height for a card above it would make the restored
  // scroll position fall in a list of the wrong length.
  useEffect(() => {
    const mark = () => {
      for (const item of list.current?.children ?? []) {
        if (item.getBoundingClientRect().top > window.innerHeight)
          item.setAttribute('data-skippable', '');
      }
    };
    window.addEventListener('scroll', mark, { once: true, passive: true });
    return () => window.removeEventListener('scroll', mark);
  }, []);

  return (
    <ul ref={list} className="ingredient-card-list" aria-label={label} data-density={density}>
      {Children.toArray(children).map((child, at) => (
        <li key={at}>{child}</li>
      ))}
    </ul>
  );
};

export default IngredientCardList;
export type { IngredientCardListProps } from './types';
