'use client';

import { type KeyboardEvent, type ReactElement, useEffect, useId, useRef, useState } from 'react';
import type { AddDestination } from './types';

// The chevron beside Add Ingredient and the menu of places it can go. The repo
// had no ARIA menu to reuse (AccountMenu is a disclosure on purpose), so this
// is the small one the APG menu-button pattern asks for: the focus moves to
// the first item on opening, the arrows, Home and End rove, Escape closes and
// hands the focus back to the chevron, and a press outside closes.
// claude-docs/components/app-shell.md, "Add Ingredient".

const Chevron = (): ReactElement => (
  <svg viewBox="0 0 16 16" width="1em" height="1em" aria-hidden="true" focusable="false">
    <path
      d="M3.5 6l4.5 4.5L12.5 6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function AddIngredientMenu({
  destinations,
  className,
  onChoose,
}: {
  destinations: readonly AddDestination[];
  className: string;
  onChoose: (destination: AddDestination) => void;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const items = (): HTMLElement[] =>
    Array.from(root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const closeOnOutsidePress = (event: PointerEvent): void => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePress);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePress);
  }, [open]);

  const onMenuKey = (event: KeyboardEvent): void => {
    const all = items();
    const at = all.indexOf(document.activeElement as HTMLElement);
    const move = (to: number): void => {
      event.preventDefault();
      all[(to + all.length) % all.length]?.focus();
    };
    if (event.key === 'ArrowDown') move(at + 1);
    else if (event.key === 'ArrowUp') move(at - 1);
    else if (event.key === 'Home') move(0);
    else if (event.key === 'End') move(all.length - 1);
    else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      toggle.current?.focus();
    } else if (event.key === 'Tab') setOpen(false);
  };

  return (
    <span ref={root} className="app-shell__add-more">
      <button
        ref={toggle}
        type="button"
        className={className}
        aria-label="Choose Where to Add"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((was) => !was)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <Chevron />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Add Ingredient To"
          className="app-shell__menu"
          onKeyDown={onMenuKey}
        >
          {destinations.map((destination) => (
            <button
              key={destination.key}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className="app-shell__menu-item"
              onClick={() => {
                setOpen(false);
                onChoose(destination);
              }}
            >
              to {destination.name}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
