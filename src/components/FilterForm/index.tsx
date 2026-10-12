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

// A list's filter, a toolbar that applies as it changes (MB.115, the owner's
// call over a Filter button pressed after the fields): a select or a switch
// applies on its change, a type-ahead once a choice settles, and the search
// on its own submit, the magnifier at the end of its box (`SearchField`), or
// Enter. Each opens the new filter from the first page as a soft navigation
// through the list's `ListFrame`, so while the new list reads, the row greys
// out as a tabbed page's tabs do and the list beneath it is the tabs'
// skeleton. A GET form to the page itself (MB.52, MB.178), so before
// hydration the search's submit still sends every field under the name the
// page reads. Clear, a plain link to the page itself, is drawn only while the
// page shows a filter. The caller holds its fields and what each applies;
// this holds the form, Clear and the navigation, which five lists had each
// written for themselves (claude-docs/components/filter-form.md).

/** A value the page shows a filter by: a blank, `false` or none is no filter. */
const isSet = (value: FilterValue): boolean =>
  typeof value === 'string' ? value.trim() !== '' : value === true;

/** The caller's controls, which the row marks `aria-disabled` while a list is on its way. */
const FIELD_CONTROLS = 'input:not([type="hidden"]), select, textarea, button, a[href]';

/** What would change a field or press a control, each refused while a list is on its way. */
const PRESSES = ['keydown', 'beforeinput', 'mousedown', 'click', 'paste', 'drop'] as const;

/**
 * The row's control to focus again once the list a filter opened arrives,
 * by its place among the row's controls, `-1` for none. The list keys its
 * filter by the filter shown, so the row that applied is thrown away and a
 * new one drawn, and the focus would fall to the page. By place rather than
 * by id: `useId` numbers a row drawn in the browser afresh, so the new
 * row's ids are not the old one's, while its controls stand in the same
 * order, Clear, the one that comes and goes, last. Module state rather than
 * a context: the filter's own handlers apply it, and they sit above the
 * FilterForm a context would come from. One list navigates at a time, so one
 * slot is enough.
 */
const refocus = { wanted: false, at: -1 };

/** The row's controls in document order: the ones the row marks while a list is on its way. */
const controlsOf = (row: Element) => [...row.querySelectorAll<HTMLElement>(FIELD_CONTROLS)];

/**
 * Opens the list under a new filter from its first page, softly, through the
 * list's `ListFrame`: a select's or a switch's change, a type-ahead's settled
 * choice. Soft on every list, the admin ones too, since every page under
 * `/admin` runs its own guard (`src/app/admin/layout.tsx`).
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
  children,
}: FilterFormProps): ReactElement => {
  const { pending } = useListNavigation();
  const apply = useApplyFilter();
  const filtered = shown.some(isSet);
  const form = useRef<HTMLFormElement>(null);

  // Once the list arrives, the control that had the focus has it again, in
  // the row drawn for the new filter. Read as the old row goes rather than
  // when the filter applied: a type-ahead applies as it is left, when the
  // focus is between controls, and lands on the next one only after.
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

  // While a list is on its way the fields are off as the tabs are: each of
  // the caller's controls `aria-disabled`, so a focus stays where it was
  // rather than falling to the page as a `disabled` field's would, and every
  // key but Tab, every press and every edit refused before it reaches them.
  // Set on the controls themselves, since the caller draws them; Clear
  // carries it already, and is left to React.
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

  // The search's submit, or Enter in any box. Always offered: the same text
  // again reads the list again, which is harmless, where a submit disabled
  // until something changed read as dead (the owner's call).
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
    <search>
      <form
        className="filter-row"
        ref={form}
        method="get"
        action={action}
        aria-label={label}
        aria-busy={pending || undefined}
        onSubmit={submit}
      >
        {children}
        {/* A link, not a submit: the unfiltered first page is the page
            itself, every filter parameter, the cursor and a modal's gone,
            which works before hydration as an address. Drawn only while
            there is something to clear, the owner's call, rather than
            disabled in place: it sits at the row's end, so nothing moves
            when it comes and goes. */}
        {filtered && (
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
