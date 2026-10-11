'use client';

import {
  Fragment,
  type FormEvent,
  type MouseEvent,
  type ReactElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { opensElsewhere } from '../../lib/opens-elsewhere';
import { useListNavigation } from '../ListFrame';
import type { FilterFormProps, FilterValue } from './types';

// A list's filter: a GET form to the page itself (MB.52, MB.178), so before
// hydration it still submits natively, each field under the name the page
// reads. Once hydrated, Filter is offered only when the form differs from the
// filter the page shows (MB.53, the owner's word), and opens the new filter
// from the first page. Clear Filters, after it, is a link to the page itself
// with no filter, offered while the page shows one or a field holds a value
// not yet applied (the owner's calls at MB.115's review): with a filter shown
// it opens the unfiltered list, and with only unapplied values it empties the
// fields where they are. Both navigate through the list's `ListFrame`, so
// while the new list reads, the row greys out as a tabbed page's tabs do and
// the list beneath it is the tabs' skeleton (the owner's call). The caller
// keeps its own field state and supplies the fields; this holds the form, the
// two controls and the navigation, which five lists had each written for
// themselves (claude-docs/components/filter-form.md).

/** A value the page shows a filter by: a blank, `false` or none is no filter. */
const isSet = (value: FilterValue): boolean =>
  typeof value === 'string' ? value.trim() !== '' : value === true;

/** The caller's controls, which the row marks `aria-disabled` while a list is on its way. */
const FIELD_CONTROLS = 'input:not([type="hidden"]), select, textarea, button, a[href]';

/** What would change a field or press a control, each refused while a list is on its way. */
const PRESSES = ['keydown', 'beforeinput', 'mousedown', 'click', 'paste', 'drop'] as const;

const FilterForm = ({
  label,
  action,
  href,
  disabled,
  shown,
  draft,
  onClear,
  navigation,
  children,
}: FilterFormProps): ReactElement => {
  const { pending, go } = useListNavigation();
  const filtered = shown.some(isSet);
  const drafted = draft.some(isSet);
  const form = useRef<HTMLFormElement>(null);
  // Bumped by an in-place clear, which keys the fields: a type-ahead keeps
  // its own text, which may name no choice and so be no value, and starts
  // again empty only by being drawn again.
  const [emptied, setEmptied] = useState(0);

  // An in-place clear takes the focus to the first field once the fields are
  // drawn again: the pressed Clear Filters has nothing left to do and is no
  // longer focusable.
  useEffect(() => {
    if (emptied === 0) return;
    form.current
      ?.querySelector<HTMLElement>('input:not([type="hidden"]), select, textarea')
      ?.focus();
  }, [emptied]);

  // While a list is on its way the fields are off as the tabs are: each of
  // the caller's controls `aria-disabled`, so a focus stays where it was
  // rather than falling to the page as a `disabled` field's would, and every
  // key but Tab, every press and every edit refused before it reaches them.
  // Set on the controls themselves, since the caller draws them; the two
  // controls this draws carry it already, and are left to React.
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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // A disabled submit stops a click, not a form submitted by Enter.
    if (disabled || pending) return;
    go(href(), navigation);
  }

  // A plain left click navigates as Filter does; a new tab or window is the
  // browser's, through the real address.
  function clear(event: MouseEvent<HTMLAnchorElement>) {
    if (opensElsewhere(event)) return;
    event.preventDefault();
    if (pending) return;
    if (filtered) {
      go(action, navigation);
      return;
    }
    onClear();
    setEmptied((count) => count + 1);
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
        <Fragment key={emptied}>{children}</Fragment>
        {/* `disabled` with nothing to send, a submit with nothing to do;
            `aria-disabled` while a list is on its way, so a focus on it stays. */}
        <button
          type="submit"
          className="btn btn--solid"
          disabled={disabled}
          aria-disabled={pending || undefined}
        >
          Filter
        </button>
        {filtered || drafted ? (
          // A link, not a submit: the unfiltered first page is the page
          // itself, which works before hydration as an address, and a submit
          // would send the fields as they stand. Before hydration the fields
          // hold the filter shown, so it is offered only for that.
          <a
            className="btn btn--quiet"
            href={action}
            onClick={clear}
            aria-disabled={pending || undefined}
          >
            Clear Filters
          </a>
        ) : (
          // Disabled rather than hidden with nothing to clear, as
          // Filter is with nothing to send and the pager's end with no page,
          // so neither control moves. An anchor cannot be `disabled`: no
          // address and `aria-disabled`, with the role kept so it still reads
          // as the link it is (claude-docs/components/pager.md).
          // oxlint-disable-next-line jsx-a11y/anchor-is-valid, jsx-a11y/no-redundant-roles
          <a className="btn btn--quiet" role="link" aria-disabled="true">
            Clear Filters
          </a>
        )}
      </form>
    </search>
  );
};

export default FilterForm;
