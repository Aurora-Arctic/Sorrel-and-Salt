'use client';

import { type ReactElement, useId, useState } from 'react';
import { FieldShell, fieldDescription } from '../Field';
import FilterForm from '../FilterForm';
import { groupedValuesHref } from './href';
import { KINDS } from './kinds';
import type { GroupedValueListFilterProps } from './types';

// The filter's fields (MB.178): a name, and for a grouped kind its group.
// `FilterForm` holds the form, the Filter button and the soft navigation; this
// holds what the fields say and whether they differ from the filter the page
// shows. The group is a native `<select>`, not `ComboboxSelect`, so before
// hydration the form still submits natively, as `query=&group=`, which the
// page reads as no filter. The list keys this by the filter shown, so a page
// showing another — Back, say — starts it again from that one.
const GroupedValueListFilter = ({
  kind,
  filter,
  groups,
}: GroupedValueListFilterProps): ReactElement => {
  const { path, title, group } = KINDS[kind];
  const query = fieldDescription({ id: `${useId()}-query` });
  const groupField = fieldDescription({ id: `${useId()}-group` });
  const [draftQuery, setDraftQuery] = useState(filter.query);
  const [draftGroup, setDraftGroup] = useState(filter.group);
  const changed = draftQuery.trim() !== filter.query || draftGroup !== filter.group;

  return (
    <FilterForm
      label={`Filter ${title}`}
      action={path}
      href={() => groupedValuesHref(kind, { query: draftQuery.trim(), group: draftGroup })}
      disabled={!changed}
      navigation="soft"
    >
      <FieldShell label="Name" {...query}>
        <input
          id={query.controlId}
          className="input"
          type="search"
          name="query"
          value={draftQuery}
          onChange={(event) => setDraftQuery(event.target.value)}
        />
      </FieldShell>
      {group && (
        <FieldShell label={group.label} {...groupField}>
          <select
            id={groupField.controlId}
            className="select"
            name={group.param}
            value={draftGroup}
            onChange={(event) => setDraftGroup(event.target.value)}
          >
            <option value="">All {group.plural}</option>
            {groups.map((each) => (
              <option key={each.slug} value={each.slug}>
                {each.name}
              </option>
            ))}
          </select>
        </FieldShell>
      )}
    </FilterForm>
  );
};

export default GroupedValueListFilter;
