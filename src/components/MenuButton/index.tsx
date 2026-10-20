'use client';

import Link from 'next/link';
import { type KeyboardEvent, type ReactElement, useEffect, useId, useRef, useState } from 'react';
import { useListPosition } from '../Combobox/position';
import Spinner from '../Spinner';
import type { MenuButtonItem, MenuButtonProps } from './types';
import './index.scss';

// A labelled button with a chevron that opens a menu of choices, none of them
// the button's own: the APG menu-button pattern, as the bar's Add Ingredient
// chevron has it (claude-docs/components/app-shell.md). Opening moves the
// focus to the first item; the arrows, Home and End rove; Escape closes and
// hands the focus back; Tab and a press outside close. An item is a link or
// an action, and choosing either closes the menu first. It fades in and out
// over the short motion (the owner's call, 2026-10-19): a closing menu stays
// drawn, inert and hidden from assistive technology, until its fade ends. It
// is placed as a Combobox's list is (MB.154), on Floating UI: hung from the
// button's end edge, below it, or above it when there is more room there, as
// at the foot of a dialog or the window, and shifted to stay on the screen,
// clear of the phone's bottom bar; fixed, so a scrolling dialog cannot clip
// it, and following a scroll or a resize while open. Which side it opens
// toward is the room's to decide (M8.17), bar one choice the caller makes:
// `placement="auto"` hangs it from the button's start edge when the button
// sits in the start half of the window, where a header wrapped it under its
// title, and the end edge otherwise. claude-docs/components/menu-button.md.

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

/** The gap between button and menu, space(2), as the stylesheet kept it before Floating UI. */
const MENU_GAP_PX = 8;

/** Past the fade's own length (index.scss), for a browser that never reports its end. */
const FADE_LIMIT_MS = 400;

/** Motion turned down, or no way to ask, so a close is not held for a fade. */
const fadesAreOff = (): boolean =>
  typeof window.matchMedia !== 'function' ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The edge to hang a menu from: the button's start edge when its centre is in
 * the start half of the window, so the menu opens toward the room, else the end
 * edge. Read when the menu opens, since a header's wrapping moves the button.
 */
const edgeFor = (button: HTMLElement | null): 'bottom-start' | 'bottom-end' => {
  if (!button) return 'bottom-end';
  const { left, width } = button.getBoundingClientRect();
  return left + width / 2 < window.innerWidth / 2 ? 'bottom-start' : 'bottom-end';
};

const itemClass = (item: MenuButtonItem, chosen: boolean): string =>
  [
    'menu-button__item',
    item.destructive && 'menu-button__item--destructive',
    item.primary && 'menu-button__item--primary',
    item.constructive && 'menu-button__item--constructive',
    chosen && 'is-chosen',
  ]
    .filter(Boolean)
    .join(' ');

export default function MenuButton({
  label,
  className,
  items,
  busy = false,
  busyLabel,
  buttonType = false,
  icon,
  placement = 'end',
  ref,
}: MenuButtonProps): ReactElement {
  const [open, setOpenState] = useState(false);
  // Still drawn: open, or fading out.
  const [drawn, setDrawn] = useState(false);
  // The item just chosen, which keeps its hover look while the menu fades: a
  // closing menu is inert, which drops the hover and would drain the fill in
  // front of the eye (index.scss).
  const [chosen, setChosen] = useState<string>();
  const root = useRef<HTMLSpanElement>(null);
  const toggle = useRef<HTMLButtonElement | null>(null);
  const menuId = useId();
  // The edge the menu hangs from, chosen as it opens (`placement="auto"`) and
  // held while it is open and fading, so it does not jump if the page moves.
  const [edge, setEdge] = useState<'bottom-start' | 'bottom-end'>('bottom-end');
  const { setControl, setList, listStyle } = useListPosition(open, undefined, {
    matchWidth: false,
    placement: edge,
    gap: MENU_GAP_PX,
  });

  const setOpen = (next: boolean | ((was: boolean) => boolean)): void => {
    setOpenState((was) => {
      const now = typeof next === 'function' ? next(was) : next;
      if (now) {
        setEdge(placement === 'auto' ? edgeFor(toggle.current) : 'bottom-end');
        setDrawn(true);
        setChosen(undefined);
      } else if (fadesAreOff()) setDrawn(false);
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
          setControl(node);
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
        {busy && <Spinner />}
        {icon ? (
          // An icon alone (a list card's More, M8.17): the words still name the
          // button, hidden, and no chevron, as the row's other icons have none.
          <>
            {!busy && icon}
            <span className="visually-hidden">{busy ? (busyLabel ?? label) : label}</span>
          </>
        ) : (
          <>
            {busy ? (busyLabel ?? label) : label}
            {!busy && <Chevron />}
          </>
        )}
      </button>
      {/* Kept in the page once closed, hidden, so a dialog an item's link opened
          can find that link when it closes and give the focus to this button
          (RouteModal's linkTo). */}
      <div
        ref={setList}
        id={menuId}
        role="menu"
        aria-label={label}
        aria-hidden={!open || undefined}
        inert={!open}
        hidden={!drawn}
        style={listStyle}
        className={[
          'menu-button__menu',
          buttonType && 'menu-button__menu--button-type',
          !open && 'is-closing',
        ]
          .filter(Boolean)
          .join(' ')}
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
              className={itemClass(item, chosen === item.key)}
              onClick={(event) => {
                setChosen(item.key);
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
              className={itemClass(item, chosen === item.key)}
              onClick={() => {
                setChosen(item.key);
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ),
        )}
      </div>
    </span>
  );
}
