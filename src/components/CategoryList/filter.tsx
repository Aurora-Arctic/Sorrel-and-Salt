'use client';

import { type FormEvent, type ReactElement, useState } from 'react';
import { categoriesHref } from './href';
import type { CategoryListFilterProps } from './types';

// The filter, a GET form to the page itself (MB.178), as the user list's
// (MB.52). Filter is offered only when the form differs from the filter the
// page shows, and opens the new filter as a full load from the first page.
// The group is a native `<select>`, not `ComboboxSelect`, so before hydration
// the form still submits natively, as `query=&group=`, which the page reads
// as no filter.
const CategoryListFilter = ({ filter, groups }: CategoryListFilterProps): ReactElement => {
  const [draftQuery, setDraftQuery] = useState(filter.query);
  const [draftGroup, setDraftGroup] = useState(filter.group);
  const changed = draftQuery.trim() !== filter.query || draftGroup !== filter.group;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!changed) return;
    window.location.assign(categoriesHref({ query: draftQuery.trim(), group: draftGroup }));
  }

  return (
    <search>
      <form
        className="category-list__search"
        method="get"
        action="/admin/categories"
        aria-label="Filter categories"
        onSubmit={submit}
      >
        <div className="field">
          <label className="field__label" htmlFor="category-list-query">
            Name
          </label>
          <input
            id="category-list-query"
            className="input"
            type="search"
            name="query"
            value={draftQuery}
            onChange={(event) => setDraftQuery(event.target.value)}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="category-list-group">
            Group
          </label>
          <select
            id="category-list-group"
            className="select"
            name="group"
            value={draftGroup}
            onChange={(event) => setDraftGroup(event.target.value)}
          >
            <option value="">All groups</option>
            {groups.map((group) => (
              <option key={group.slug} value={group.slug}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
        {/* `disabled`, not `aria-disabled`: a submit with nothing to send. */}
        <button className="btn btn--solid" type="submit" disabled={!changed}>
          Filter
        </button>
      </form>
    </search>
  );
};

export default CategoryListFilter;
