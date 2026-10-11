'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactElement, useEffect, useState, useTransition } from 'react';
import BusyButton from '../BusyButton';
import type { FilterFormProps } from './types';

// A list's filter: a GET form to the page itself (MB.52, MB.178), so before
// hydration it still submits natively, each field under the name the page
// reads. Once hydrated, Filter is offered only when the form differs from the
// filter the page shows (MB.53, the owner's word), and opens the new filter
// from the first page, busy until it arrives. The caller keeps its own field
// state and supplies the fields; this holds the form, the button and the
// navigation, which five lists had each written for themselves
// (claude-docs/components/filter-form.md).
const FilterForm = ({
  label,
  action,
  href,
  disabled,
  navigation,
  children,
}: FilterFormProps): ReactElement => {
  const router = useRouter();
  const [filtering, startFiltering] = useTransition();
  // A full load has no transition to wait on: the flag holds the spinner
  // until the page unloads.
  const [leaving, setLeaving] = useState(false);
  const busy = filtering || leaving;

  // Back to a page the browser kept whole (the back-forward cache) restores
  // it as it was left, spinner and all: the flag drops when it is shown again,
  // as Pager's plain end does.
  useEffect(() => {
    if (!leaving) return;
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setLeaving(false);
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [leaving]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // A disabled submit stops a click, not a form submitted by Enter.
    if (disabled || busy) return;
    if (navigation === 'full') {
      setLeaving(true);
      window.location.assign(href());
      return;
    }
    startFiltering(() => router.push(href()));
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
          busy={busy}
          busyLabel="Filtering"
        >
          Filter
        </BusyButton>
      </form>
    </search>
  );
};

export default FilterForm;
