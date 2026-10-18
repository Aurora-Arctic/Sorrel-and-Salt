import type { Story } from '@ladle/react';
import { GROUP_NAMES, asSlugs } from '../../../.ladle/fixtures';
import GroupedValueListFilter from '../GroupedValueList/filter';
import type { GroupedValueListFilter as Shown } from '../GroupedValueList/types';
import ListFrame from '../ListFrame';

// Render-only; the lists that use it assert their filters. FilterForm is drawn
// here as a list draws it: the categories list's own filter
// (`GroupedValueListFilter`, a Name search and a type-ahead Group select, no
// switch) inside a ListFrame, which holds the navigation it needs. The
// workshop's router goes nowhere, so a change shows nothing on its way here
// (GroupedValueList's `Pending` stories draw that). The search applies from
// its magnifier or Enter, the group on its pick, and Clear is drawn only
// while the page shows a filter. The groups are the workshop's invented ones.
export default {
  title: 'Admin / Filter Form',
};

const GROUPS = asSlugs(GROUP_NAMES.category);

const NO_FILTER: Shown = { query: '', group: '' };

const Framed = ({ shown = NO_FILTER }: { shown?: Shown }) => (
  <ListFrame>
    <GroupedValueListFilter kind="category" filter={shown} groups={GROUPS} />
  </ListFrame>
);

// A page showing no filter: nothing to clear, so no Clear.
export const Default: Story = () => <Framed />;

export const PhoneDark: Story = () => <Framed />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <Framed />;
PhoneLight.meta = { theme: 'light', width: 375 };

// A page showing a filter: Clear, a link to the page itself, ends the row.
const FILTER: Shown = { query: 'test', group: GROUPS[0].slug };

export const Filtered: Story = () => <Framed shown={FILTER} />;

export const FilteredPhoneDark: Story = () => <Framed shown={FILTER} />;
FilteredPhoneDark.meta = { theme: 'dark', width: 375 };

export const FilteredPhoneLight: Story = () => <Framed shown={FILTER} />;
FilteredPhoneLight.meta = { theme: 'light', width: 375 };
