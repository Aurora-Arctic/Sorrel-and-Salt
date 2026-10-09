'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, type ReactElement, useId, useState, useTransition } from 'react';
import { groupedValuesHref } from './href';
import { KINDS } from './kinds';
import type { GroupedValueListFilterProps } from './types';

// The filter, a GET form to the page itself (MB.178), as the user list's
// (MB.52). Filter is offered only when the form differs from the filter the
// page shows, and opens the new filter from the first page as a soft
// navigation, as the pager's links are: inside a transition, so Filter shows
// the spinner until the filtered list arrives, which a full load could not.
// The group is a native `<select>`, not `ComboboxSelect`, so before hydration
// the form still submits natively, as `query=&group=`, which the page reads
// as no filter. The list keys this by the filter shown, so a page showing
// another — Back, say — starts it again from that one.
const GroupedValueListFilter = ({
  kind,
  filter,
  groups,
}: GroupedValueListFilterProps): ReactElement => {
  const id = useId();
  const { path, plural, groupLabel, groupPlural, groupParam } = KINDS[kind];
  const [draftQuery, setDraftQuery] = useState(filter.query);
  const [draftGroup, setDraftGroup] = useState(filter.group);
  const [filtering, startFiltering] = useTransition();
  const router = useRouter();
  const changed = draftQuery.trim() !== filter.query || draftGroup !== filter.group;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!changed || filtering) return;
    startFiltering(() => {
      router.push(groupedValuesHref(kind, { query: draftQuery.trim(), group: draftGroup }));
    });
  }

  return (
    <search>
      <form
        className="grouped-value-list__search"
        method="get"
        action={path}
        aria-label={`Filter ${plural}`}
        onSubmit={submit}
      >
        <div className="field">
          <label className="field__label" htmlFor={`${id}-query`}>
            Name
          </label>
          <input
            id={`${id}-query`}
            className="input"
            type="search"
            name="query"
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor={`${id}-group`}>
            {groupLabel}
          </label>
          <select
            id={`${id}-group`}
            className="select"
            name={groupParam}
            value={draftGroup}
            onChange={(event) => setDraftGroup(event.target.value)}
          >
            <option value="">All {groupPlural}</option>
            {groups.map((group) => (
              <option key={group.slug} value={group.slug}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
        {/* `disabled`, not `aria-disabled`: a submit with nothing to send. */}
        <button
          className="btn btn--solid"
          type="submit"
          disabled={!changed || filtering}
          aria-busy={filtering || undefined}
        >
          {filtering && <span className="spinner" aria-hidden="true" />}
          {filtering ? 'Filtering' : 'Filter'}
        </button>
      </form>
    </search>
  );
};

export default GroupedValueListFilter;
