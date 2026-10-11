'use client';

import { type ReactElement, useId, useMemo, useState, useSyncExternalStore } from 'react';
import { ComboboxTypeahead } from '../Combobox/typeahead';
import { FieldShell, fieldDescription } from '../Field';
import FilterForm from '../FilterForm';
import { groupedValuesHref } from './href';
import { KINDS } from './kinds';
import type { GroupedValueListFilterProps } from './types';

// The filter's fields (MB.178): a name, and for a grouped kind its group.
// `FilterForm` holds the form, the Filter button and the soft navigation; this
// holds what the fields say and whether they differ from the filter the page
// shows. The group is typed into once hydrated, the owner's call (MB.115),
// but the server draws it as a native `<select>`, so before hydration the
// form still submits natively, as `query=&group=`, which the page reads as
// no filter; a hidden input carries the same parameter after. The list keys
// this by the filter shown, so a page showing another — Back, say — starts it
// again from that one.

// Nothing to subscribe to: the snapshot differs only between the server's
// render, and the hydration that follows it, and every render after.
const noSubscription = () => () => {};

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
  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  const choices = useMemo(
    () => groups.map((each) => ({ value: each.slug, label: each.name })),
    [groups],
  );

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
          {hydrated ? (
            <>
              {/* Every group while blank, as the select's first choice says;
                  the clear is the way back to it. */}
              <ComboboxTypeahead
                id={groupField.controlId}
                label={group.label}
                labelId={groupField.labelId}
                value={draftGroup}
                onChange={setDraftGroup}
                choices={choices}
                placeholder={`All ${group.plural}`}
                clearable
              />
              <input type="hidden" name={group.param} value={draftGroup} />
            </>
          ) : (
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
          )}
        </FieldShell>
      )}
    </FilterForm>
  );
};

export default GroupedValueListFilter;
