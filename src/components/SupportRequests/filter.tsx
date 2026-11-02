'use client';

import { type ReactElement, useState } from 'react';
import { FilterSelectField, SearchField } from '../Field';
import { ChoiceChip } from '../FacetPanel/choice-chip';
import FilterForm, { useApplyFilter } from '../FilterForm';
import { SproutIcon } from '../IconTip/icons';
import {
  SUPPORT_ABOUTS,
  SUPPORT_SENDER_GROUPS,
  type SupportSenderGroup,
} from '../../lib/support-path';
import { SUPPORT_PATH, supportHref } from './href';
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

/** Each sender group's mark, the same one its senders carry in the table. */
const SENDER_ICONS: Record<SupportSenderGroup, ReactElement> = {
  beta_tester: <SproutIcon />,
};

const SENDER_OPTIONS = [
  { value: '' as const, label: 'All' },
  ...SUPPORT_SENDER_GROUPS.map(({ value, label }) => ({ value, label, icon: SENDER_ICONS[value] })),
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
      shown={[filter.about, filter.view, filter.errorCode, filter.sender]}
    >
      <input type="hidden" name="view" value={filter.view} />
      <SearchField
        label="Error #"
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
      <ChoiceChip
        legend="Sender"
        name="sender"
        options={SENDER_OPTIONS}
        value={filter.sender}
        onChange={(sender) => apply(supportHref({ ...filter, errorCode: code, sender }))}
      />
    </FilterForm>
  );
};

export default SupportRequestsFilter;
