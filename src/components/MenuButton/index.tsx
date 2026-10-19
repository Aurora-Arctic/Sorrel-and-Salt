'use client';

import Link from 'next/link';
import { type KeyboardEvent, type ReactElement, useEffect, useId, useRef, useState } from 'react';
import type { MenuButtonItem, MenuButtonProps } from './types';
import './index.scss';

// A labelled button with a chevron that opens a menu of choices, none of them
// the button's own: the APG menu-button pattern, as the bar's Add Ingredient
// chevron has it (claude-docs/components/app-shell.md). Opening moves the
// focus to the first item; the arrows, Home and End rove; Escape closes and
// hands the focus back; Tab and a press outside close. An item is a link or
// an action, and choosing either closes the menu first. It fades in and out
// over the short motion (the owner's call, 2026-10-19): a closing menu stays
// drawn, inert and hidden from assistive technology, until its fade ends.
// claude-docs/components/menu-button.md.

const Chevron = (): ReactElement => (
  <svg
    className="menu-button__chevron"
    viewBox="0 0 16 16"
    width="1em"
    height="1em"
    aria-hidden="true"
    focusable="false"
  >
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

/** Past the fade's own length (index.scss), for a browser that never reports its end. */
const FADE_LIMIT_MS = 400;

/** Motion turned down, or no way to ask, so a close is not held for a fade. */
const fadesAreOff = (): boolean =>
  typeof window.matchMedia !== 'function' ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const itemClass = (item: MenuButtonItem): string =>
  item.destructive ? 'menu-button__item menu-button__item--destructive' : 'menu-button__item';

export default function MenuButton({
  label,
  className,
  items,
  busy = false,
  busyLabel,
  ref,
}: MenuButtonProps): ReactElement {
  const [open, setOpenState] = useState(false);
  // Still drawn: open, or fading out.
  const [drawn, setDrawn] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const toggle = useRef<HTMLButtonElement | null>(null);
  const menuId = useId();

  const setOpen = (next: boolean | ((was: boolean) => boolean)): void => {
    setOpenState((was) => {
      const now = typeof next === 'function' ? next(was) : next;
      if (now) setDrawn(true);
      else if (fadesAreOff()) setDrawn(false);
      return now;
    });
  };

  // A fade that never reports its end still ends.
  useEffect(() => {
    if (open || !drawn) return;
    const timer = window.setTimeout(() => setDrawn(false), FADE_LIMIT_MS);
    return () => window.clearTimeout(timer);
  }, [open, drawn]);

  const all = (): HTMLElement[] =>
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
    const list = all();
    const at = list.indexOf(document.activeElement as HTMLElement);
    const move = (to: number): void => {
      event.preventDefault();
      list[(to + list.length) % list.length]?.focus();
    };
    if (event.key === 'ArrowDown') move(at + 1);
    else if (event.key === 'ArrowUp') move(at - 1);
    else if (event.key === 'Home') move(0);
    else if (event.key === 'End') move(list.length - 1);
    else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      toggle.current?.focus();
    } else if (event.key === 'Tab') setOpen(false);
  };

  return (
    <span ref={root} className="menu-button">
      <button
        ref={(node) => {
          toggle.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        type="button"
        className={className}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-busy={busy || undefined}
        disabled={busy}
        onClick={() => setOpen((was) => !was)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {busy && <span className="spinner" aria-hidden="true" />}
        {busy ? (busyLabel ?? label) : label}
        {!busy && <Chevron />}
      </button>
      {drawn && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          aria-hidden={!open || undefined}
          inert={!open}
          className={open ? 'menu-button__menu' : 'menu-button__menu is-closing'}
          onKeyDown={onMenuKey}
          onAnimationEnd={(event) => {
            if (!open && event.target === event.currentTarget) setDrawn(false);
          }}
        >
          {items.map((item) =>
            item.href !== undefined ? (
              <Link
                key={item.key}
                href={item.href}
                role="menuitem"
                tabIndex={-1}
                className={itemClass(item)}
                onClick={(event) => {
                  setOpen(false);
                  item.onClick?.(event);
                }}
              >
                {item.label}
              </Link>
            ) : (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                tabIndex={-1}
                className={itemClass(item)}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </span>
  );
}
