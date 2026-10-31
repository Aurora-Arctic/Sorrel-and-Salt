'use client';

import { type ReactElement, useState } from 'react';
import { FilterSelectField, SearchField } from '../Field';
import FilterForm, { useApplyFilter } from '../FilterForm';
import { SUPPORT_PATH, supportHref } from './href';
import type { SupportKind, SupportRequestsFilterProps, SupportStatus } from './types';

// The list's filter on the shared FilterForm: Kind and Status apply as they change, the error number is
// held until the magnifier or Enter sends it. Before hydration the form submits natively
// (`kind=`, `status=`, `error=`); the list keys this by the filter shown.

export const KIND_OPTIONS: readonly { value: SupportKind; label: string }[] = [
  { value: 'accessibility', label: 'Accessibility' },
  { value: 'bug', label: 'Bug' },
  { value: 'question', label: 'Question' },
];

export const STATUS_OPTIONS: readonly { value: SupportStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
];

const SupportRequestsFilter = ({ filter }: SupportRequestsFilterProps): ReactElement => {
  const [draftCode, setDraftCode] = useState(filter.errorCode);
  const apply = useApplyFilter();
  const code = draftCode.trim();

  return (
    <FilterForm
      label="Filter Support Requests"
      action={SUPPORT_PATH}
      searchHref={() => supportHref({ ...filter, errorCode: code })}
      shown={[filter.kind, filter.status, filter.errorCode]}
    >
      <SearchField
        label="Error Number"
        name="error"
        placeholder="Search error numbers"
        value={draftCode}
        onChange={setDraftCode}
      />
      <FilterSelectField
        label="Kind"
        name="kind"
        all="All Kinds"
        options={KIND_OPTIONS}
        defaultValue={filter.kind}
        onChange={(kind) =>
          apply(supportHref({ ...filter, errorCode: code, kind: kind as SupportKind | '' }))
        }
      />
      <FilterSelectField
        label="Status"
        name="status"
        all="All Statuses"
        options={STATUS_OPTIONS}
        defaultValue={filter.status}
        onChange={(status) =>
          apply(supportHref({ ...filter, errorCode: code, status: status as SupportStatus | '' }))
        }
      />
    </FilterForm>
  );
};

export default SupportRequestsFilter;
