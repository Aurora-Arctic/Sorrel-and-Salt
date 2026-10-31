'use client';

import { type ReactElement, useState } from 'react';
import { FilterSelectField, SearchField } from '../Field';
import FilterForm, { useApplyFilter } from '../FilterForm';
import { SUPPORT_ABOUTS } from '../../lib/support-path';
import { BETA_ONLY, SUPPORT_PATH, supportHref } from './href';
import type { SupportAbout, SupportRequestsFilterProps, SupportStatus } from './types';

// The list's filter on the shared FilterForm: About applies as it changes, the error number is
// held until the magnifier or Enter sends it. Before hydration the form submits natively
// (`about=`, `error=`, and the view as a hidden field); the list keys this by the filter shown.

export const ABOUT_OPTIONS: readonly { value: SupportAbout; label: string }[] = SUPPORT_ABOUTS;

/** Every status a request can show. */
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
      shown={[filter.about, filter.view, filter.errorCode, filter.betaOnly]}
    >
      <input type="hidden" name="view" value={filter.view} />
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
        label="Beta Testers"
        name="beta"
        all="All"
        options={[{ value: BETA_ONLY, label: 'Only' }]}
        defaultValue={filter.betaOnly ? BETA_ONLY : ''}
        onChange={(beta) =>
          apply(supportHref({ ...filter, errorCode: code, betaOnly: beta === BETA_ONLY }))
        }
      />
    </FilterForm>
  );
};

export default SupportRequestsFilter;
