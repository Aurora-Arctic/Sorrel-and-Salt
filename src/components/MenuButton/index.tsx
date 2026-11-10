'use client';

import { FADE_LIMIT_MS, prefersReducedMotion } from '@/lib/motion';
import {
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { useDismiss } from '../../lib/use-dismiss';
import { useListPosition } from '../Combobox/position';
import { CheckIcon, ChevronIcon } from '../IconTip/icons';
import Spinner from '../Spinner';
import type { MenuButtonItem, MenuButtonProps, MenuSection } from './types';
import './index.scss';
import { PendingLink } from '../../lib/navigation';
import { cx } from '@/lib/class-names';

// A labelled button with a chevron opening a menu, the APG menu-button pattern
// (claude-docs/components/menu-button.md). Placed on Floating UI, fixed so a scrolling dialog
// cannot clip it; a closing menu stays drawn, inert, until its fade ends.

/** space(2) in pixels: the gap between button and menu. */
const MENU_GAP_PX = 8;

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
  cx(
    'menu-button__item',
    item.destructive && 'menu-button__item--destructive',
    item.primary && 'menu-button__item--primary',
    chosen && 'is-chosen',
  );

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
  preload,
  ...choices
}: MenuButtonProps): ReactElement {
  const [open, setOpenState] = useState(false);
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
      } else if (prefersReducedMotion()) setDrawn(false);
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
  }, [open]);

  useDismiss({
    active: open,
    inside: (target) => root.current?.contains(target) ?? false,
    onOutsidePress: () => setOpen(false),
  });

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
      <PendingLink
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
      </PendingLink>
    ) : (
      <button
        key={item.key}
        type="button"
        role="menuitem"
        tabIndex={-1}
        className={itemClass(item, chosen === item.key)}
        // `aria-disabled`, not `disabled`: the APG menu keeps a disabled item focusable and in
        // the roving. A press runs nothing and the menu stays open.
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
        {...preload}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-busy={busy || undefined}
        // `aria-disabled`, not `disabled`, while busy: a disabled control drops the keyboard's focus to the body. The press
        // and ArrowDown refuse here.
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
          <>
            {!busy && icon}
            <span className="visually-hidden">{busy ? (busyLabel ?? label) : label}</span>
          </>
        ) : (
          <>
            {busy ? (busyLabel ?? label) : label}
            {!busy && <ChevronIcon className="menu-button__chevron" textSized />}
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
        className={cx(
          'menu-button__menu',
          buttonType && 'menu-button__menu--button-type',
          !open && 'is-closing',
        )}
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
