'use client';

import Link from 'next/link';
import {
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { useListPosition } from '../Combobox/position';
import { CheckIcon } from '../IconTip/icons';
import Spinner from '../Spinner';
import type { MenuButtonItem, MenuButtonProps, MenuSection } from './types';
import './index.scss';

// A labelled button with a chevron opening a menu, the APG menu-button pattern
// (claude-docs/components/menu-button.md). Placed on Floating UI, fixed so a scrolling dialog
// cannot clip it; a closing menu stays drawn, inert, until its fade ends.

// Exported for a caller that draws the chevron alone as its `icon`: the bar's Add Ingredient split
// button.
export const Chevron = (): ReactElement => (
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
 * The items as drawn: the green one, marked `primary`, first, and the rest in the caller's
 * order. Done here rather than asked of every caller, so no menu can put its green item
 * elsewhere. The keys read the page, so they follow this order too.
 */
const greenFirst = (items: readonly MenuButtonItem[]): MenuButtonItem[] => {
  const green = (item: MenuButtonItem): boolean => Boolean(item.primary);
  return [...items.filter(green), ...items.filter((item) => !green(item))];
};

const itemClass = (item: MenuButtonItem, chosen: boolean): string =>
  [
    'menu-button__item',
    item.destructive && 'menu-button__item--destructive',
    item.primary && 'menu-button__item--primary',
    chosen && 'is-chosen',
  ]
    .filter(Boolean)
    .join(' ');

/**
 * One section: a group named by its visible label (APG: `role="group"` and `aria-labelledby`), a
 * separator above every one but the first. The label is text, not a menu item, so the arrows
 * skip it: the roving reads `[role="menuitem"]` alone, and the sections run on as one list.
 */
function MenuGroup({
  section,
  first,
  children,
}: {
  section: MenuSection;
  first: boolean;
  children: ReactNode;
}): ReactElement {
  const labelId = useId();
  return (
    <>
      {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label, jsx-a11y/prefer-tag-over-role -- menu items need role=menuitem siblings, so the rule and group stay plain elements with their roles */}
      {!first && <div role="separator" className="menu-button__rule" />}
      {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- menu items need role=menuitem siblings, so the rule and group stay plain elements with their roles */}
      <div role="group" aria-labelledby={labelId}>
        <div id={labelId} className="menu-button__heading">
          {section.label}
        </div>
        {children}
      </div>
    </>
  );
}

export default function MenuButton({
  label,
  className,
  busy = false,
  busyLabel,
  buttonType = false,
  icon,
  menuLabel,
  ref,
  state,
  ...choices
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
  const { setControl, setList, listStyle } = useListPosition(open, undefined, {
    matchWidth: false,
    placement: 'bottom-end',
    gap: MENU_GAP_PX,
  });

  const setOpen = (next: boolean | ((was: boolean) => boolean)): void => {
    setOpenState((was) => {
      const now = typeof next === 'function' ? next(was) : next;
      if (now) {
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

  const drawItem = (item: MenuButtonItem): ReactElement =>
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
        // `aria-disabled`, not `disabled`: the APG menu keeps a disabled item focusable and
        // in the roving, read as unavailable. A press runs nothing and the menu stays open.
        aria-disabled={item.disabled || undefined}
        // The mark joins the name, since the check that draws it is a glyph and says nothing.
        aria-label={item.mark ? `${item.label}, ${item.mark}` : undefined}
        onClick={() => {
          if (item.disabled) return;
          setChosen(item.key);
          setOpen(false);
          item.onSelect();
        }}
      >
        {item.label}
        {item.mark && (
          <span className="menu-button__mark">
            <CheckIcon />
          </span>
        )}
      </button>
    );

  const sections = 'sections' in choices ? choices.sections : undefined;

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
        data-state={state}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-busy={busy || undefined}
        // `aria-disabled`, not `disabled`, while busy: a browser drops the focus of a
        // control disabled under it to the body, so the keyboard would lose its place while
        // an add runs. Read as unavailable all the same, and the press and ArrowDown refuse
        // here.
        aria-disabled={busy || undefined}
        onClick={() => {
          if (!busy) setOpen((was) => !was);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open && !busy) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {busy && <Spinner />}
        {icon ? (
          // An icon alone (a list card's More): the words still name the button, hidden,
          // and no chevron, as the row's other icons have none.
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
        tabIndex={-1}
        aria-label={menuLabel ?? label}
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
        {sections
          ? sections
              .filter((section) => section.items.length > 0)
              .map((section, at) => (
                <MenuGroup key={section.key} section={section} first={at === 0}>
                  {greenFirst(section.items).map(drawItem)}
                </MenuGroup>
              ))
          : greenFirst(choices.items ?? []).map(drawItem)}
      </div>
    </span>
  );
}
