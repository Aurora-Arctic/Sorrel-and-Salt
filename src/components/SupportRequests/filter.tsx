'use client';

import { type ReactElement, useState } from 'react';
import { FilterSelectField, SearchField } from '../Field';
import FilterForm, { useApplyFilter } from '../FilterForm';
import { SUPPORT_ABOUTS } from '../../lib/support-path';
import { SUPPORT_PATH, supportHref } from './href';
import type { SupportAbout, SupportRequestsFilterProps, SupportStatus } from './types';

// The list's filter on the shared FilterForm: About and Status apply as they change, the error number is
// held until the magnifier or Enter sends it. Before hydration the form submits natively
// (`about=`, `status=`, `error=`); the list keys this by the filter shown.

export const ABOUT_OPTIONS: readonly { value: SupportAbout; label: string }[] = SUPPORT_ABOUTS;

export const STATUS_OPTIONS: readonly { value: SupportStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
];

/** Every status a request can show, the filter offering only the first two. */
export const STATUS_LABELS: Record<SupportStatus, string> = {
  open: 'Open',
  waiting_on_sender: 'Waiting on Sender',
  resolved: 'Resolved',
  closed: 'Closed',
};

const SupportRequestsFilter = ({ filter }: SupportRequestsFilterProps): ReactElement => {
  const [draftCode, setDraftCode] = useState(filter.errorCode);
  const apply = useApplyFilter();
  const code = draftCode.trim();

  return (
    <FilterForm
      label="Filter Support Requests"
      action={SUPPORT_PATH}
      searchHref={() => supportHref({ ...filter, errorCode: code })}
      shown={[filter.about, filter.status, filter.errorCode]}
    >
      <SearchField
        label="Error Number"
        name="error"
        placeholder="Search error numbers"
        value={draftCode}
        onChange={setDraftCode}
      />
      <FilterSelectField
        label="About"
        name="about"
        all="All"
        options={ABOUT_OPTIONS}
        defaultValue={filter.about}
        onChange={(about) =>
          apply(supportHref({ ...filter, errorCode: code, about: about as SupportAbout | '' }))
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
