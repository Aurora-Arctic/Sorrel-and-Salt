'use client';

import type { Route } from 'next';
import {
  type FormEvent,
  type MouseEvent,
  type ReactElement,
  useCallback,
  useLayoutEffect,
  useRef,
} from 'react';
import { opensElsewhere } from '../../lib/opens-elsewhere';
import { useListNavigation } from '../ListFrame';
import type { FilterFormProps, FilterValue } from './types';

// A list's filter, a toolbar that applies as it changes: a select or switch on change, a type-ahead once
// a choice settles, the search on submit or Enter, each opening the first page softly through
// `ListFrame`. A GET form, so it submits natively before hydration (claude-docs/components/filter-form.md).

/** A value the page shows a filter by: a blank, `false`, an empty list or none is no filter. */
const isSet = (value: FilterValue): boolean =>
  typeof value === 'string'
    ? value.trim() !== ''
    : Array.isArray(value)
      ? value.length > 0
      : value === true;

/**
 * The caller's controls, which the row marks `aria-disabled` while a list is
 * on its way: a select-only box among them, a `div` with the combobox role.
 */
const FIELD_CONTROLS =
  'input:not([type="hidden"]), select, textarea, button, a[href], [role="combobox"]';

/** What would change a field or press a control, each refused while a list is on its way. */
const PRESSES = ['keydown', 'beforeinput', 'mousedown', 'click', 'paste', 'drop'] as const;

/**
 * The row's control to focus again once the list a filter opened arrives, by its place among the row's
 * controls (`-1` for none), as the row that applied is thrown away. Module state, since the handlers sit
 * above the FilterForm; one list navigates at a time.
 */
const refocus = { wanted: false, at: -1 };

/** The row's controls in document order: the ones the row marks while a list is on its way. */
const controlsOf = (row: Element) => [...row.querySelectorAll<HTMLElement>(FIELD_CONTROLS)];

/**
 * Opens the list under a new filter from its first page, softly, through the list's
 * `ListFrame`. Soft on every list, the admin ones too, since every page under `/admin`
 * runs its own guard (`src/app/(shell)/admin/layout.tsx`).
 */
export function useApplyFilter(): (href: Route) => void {
  const { go } = useListNavigation();
  return useCallback(
    (href: Route) => {
      refocus.wanted = true;
      go(href, 'soft');
    },
    [go],
  );
}

const FilterForm = ({
  label,
  action,
  searchHref,
  shown,
  clear: withClear = true,
  sorrel = false,
  className,
  children,
}: FilterFormProps): ReactElement => {
  const { pending } = useListNavigation();
  const apply = useApplyFilter();
  const filtered = shown.some(isSet);
  const form = useRef<HTMLFormElement>(null);

  // Once the list arrives, the control that had the focus has it again in the new row.
  // Read as the old row goes: a type-ahead applies as it is left, with the focus between
  // controls, and lands on the next one only after.
  useLayoutEffect(() => {
    const row = form.current;
    return () => {
      if (!refocus.wanted || !row) return;
      const active = document.activeElement;
      refocus.at = active instanceof HTMLElement ? controlsOf(row).indexOf(active) : -1;
    };
  }, []);
  useLayoutEffect(() => {
    if (pending) return;
    const row = form.current;
    if (refocus.at >= 0 && row) controlsOf(row)[refocus.at]?.focus();
    refocus.wanted = false;
    refocus.at = -1;
  }, [pending]);

  // While a list is on its way the fields are `aria-disabled`, so focus stays put as it would not on a
  // `disabled` field, and every key but Tab, press and edit is refused. Set on the controls, which the
  // caller draws; Clear carries it already.
  useLayoutEffect(() => {
    const row = form.current;
    if (!pending || !row) return;
    const marked = [...row.querySelectorAll<HTMLElement>(FIELD_CONTROLS)].filter(
      (control) => !control.hasAttribute('aria-disabled'),
    );
    for (const control of marked) control.setAttribute('aria-disabled', 'true');
    const refuse = (event: Event) => {
      if (event instanceof KeyboardEvent && event.key === 'Tab') return;
      event.preventDefault();
      event.stopPropagation();
    };
    for (const type of PRESSES) row.addEventListener(type, refuse, true);
    return () => {
      for (const control of marked) control.removeAttribute('aria-disabled');
      for (const type of PRESSES) row.removeEventListener(type, refuse, true);
    };
  }, [pending]);

  // The search's submit, or Enter in any box. Always offered: the same text again reads
  // the list again, which is harmless, where a disabled submit read as dead.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    apply(searchHref());
  }

  // A plain left click opens the unfiltered list as a filter does; a new tab
  // or window is the browser's, through the real address.
  function clear(event: MouseEvent<HTMLAnchorElement>) {
    if (opensElsewhere(event)) return;
    event.preventDefault();
    if (pending) return;
    apply(action);
  }

  return (
    // The `<search>` is the one landmark and carries the name: a named
    // `<form>` inside it would be a second, listing the row twice.
    <search aria-label={label}>
      {sorrel && <div className="filter-sorrel" aria-hidden="true" />}
      <form
        className={className ? `filter-row ${className}` : 'filter-row'}
        ref={form}
        method="get"
        action={action}
        aria-busy={pending || undefined}
        onSubmit={submit}
      >
        {children}
        {/* A link, not a submit: the unfiltered first page is the page itself, every
                    filter parameter, the cursor and a modal's gone, which works before
                    hydration as an address. Drawn only while there is something to clear,
                    rather than disabled in place: it sits at the row's end, so nothing moves
                    when it comes and goes. */}
        {withClear && filtered && (
          <a
            className="filter-row__clear"
            href={action}
            onClick={clear}
            aria-disabled={pending || undefined}
          >
            Clear
          </a>
        )}
      </form>
    </search>
  );
};

export default FilterForm;
