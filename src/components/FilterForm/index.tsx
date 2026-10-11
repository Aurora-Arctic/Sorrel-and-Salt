'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import {
  type FormEvent,
  type MouseEvent,
  type ReactElement,
  useEffect,
  useState,
  useTransition,
} from 'react';
import { opensElsewhere } from '../../lib/opens-elsewhere';
import BusyButton from '../BusyButton';
import type { FilterFormProps, FilterValue } from './types';

// A list's filter: a GET form to the page itself (MB.52, MB.178), so before
// hydration it still submits natively, each field under the name the page
// reads. Once hydrated, Filter is offered only when the form differs from the
// filter the page shows (MB.53, the owner's word), and opens the new filter
// from the first page, busy until it arrives. Clear Filters, after it, is a
// link to the page itself with no filter, offered while the page shows one
// (the owner's call at MB.115's review). The caller keeps its own field state
// and supplies the fields; this holds the form, the two controls and the
// navigation, which five lists had each written for themselves
// (claude-docs/components/filter-form.md).

/** A value the page shows a filter by: a blank, `false` or none is no filter. */
const isSet = (value: FilterValue): boolean =>
  typeof value === 'string' ? value.trim() !== '' : value === true;

const FilterForm = ({
  label,
  action,
  href,
  disabled,
  shown,
  navigation,
  children,
}: FilterFormProps): ReactElement => {
  const router = useRouter();
  const [filtering, startFiltering] = useTransition();
  const [clearing, startClearing] = useTransition();
  // A full load has no transition to wait on: the flag, naming the control
  // pressed, holds its spinner until the page unloads.
  const [leaving, setLeaving] = useState<'filter' | 'clear' | null>(null);
  const filterBusy = filtering || leaving === 'filter';
  const clearBusy = clearing || leaving === 'clear';
  const busy = filterBusy || clearBusy;
  const active = shown.some(isSet);

  // Back to a page the browser kept whole (the back-forward cache) restores
  // it as it was left, spinner and all: the flag drops when it is shown again,
  // as Pager's plain end does.
  useEffect(() => {
    if (!leaving) return;
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setLeaving(null);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [leaving]);

  function go(to: () => Route, control: 'filter' | 'clear') {
    if (navigation === 'full') {
      setLeaving(control);
      window.location.assign(to());
      return;
    }
    const start = control === 'filter' ? startFiltering : startClearing;
    start(() => router.push(to()));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // A disabled submit stops a click, not a form submitted by Enter.
    if (disabled || busy) return;
    go(href, 'filter');
  }

  // A plain left click navigates as Filter does; a new tab or window is the
  // browser's, through the real address.
  function clear(event: MouseEvent<HTMLAnchorElement>) {
    if (opensElsewhere(event)) return;
    event.preventDefault();
    if (busy) return;
    go(() => action, 'clear');
  }

  return (
    <search>
      <form
        className="filter-row"
        method="get"
        action={action}
        aria-label={label}
        onSubmit={submit}
      >
        {children}
        {/* `disabled`, not `aria-disabled`: a submit with nothing to send. */}
        <BusyButton
          type="submit"
          className="btn btn--solid"
          disabled={disabled || busy}
          busy={filterBusy}
          busyLabel="Filtering"
        >
          Filter
        </BusyButton>
        {active ? (
          // A link, not a submit: the unfiltered first page is the page
          // itself, which works before hydration as an address, and a submit
          // would send the fields as they stand.
          <a
            className="btn btn--quiet"
            href={action}
            onClick={clear}
            aria-busy={clearBusy || undefined}
          >
            {clearBusy && <span className="spinner" aria-hidden="true" />}
            {clearBusy ? 'Clearing Filters' : 'Clear Filters'}
          </a>
        ) : (
          // Disabled rather than hidden while the page shows no filter, as
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
