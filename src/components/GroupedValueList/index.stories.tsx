import type { Story } from '@ladle/react';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import GroupedValueList from '.';
import { deitySlug, formSlug, slugify } from '../../lib/slugify';
import { stackCell, tableRole } from '../../lib/table-roles';
import PageHeader from '../PageHeader';
import Pager from '../Pager';
import ValueFilter from './filter';
import { groupedValuesHref } from './href';
import type { GroupedValueGroupOption, GroupedValueListFilter } from './types';
import './proposals.scss';

// Render-only; behaviour is asserted in tests/components/GroupedValueList.
// The filter reaches the admin pages (`/admin/categories` and the rest),
// which the workshop does not serve.
export default {
  title: 'Admin / Grouped Value List',
};

const NO_FILTER: GroupedValueListFilter = { query: '', group: '' };

const CATEGORY_GROUPS: readonly GroupedValueGroupOption[] = [
  { slug: 'fixture-healing', name: 'Fixture Healing' },
  { slug: 'fixture-protection', name: 'Fixture Protection' },
];

// Two of the seed's colour pairs, copied from src/db/seed/category-groups.ts,
// which a component may not import, on the invented groups.
const COLORS: Record<string, { colorDark: string; colorLight: string }> = {
  'Fixture Protection': { colorDark: '#5d8ab1', colorLight: '#286ba6' },
  'Fixture Healing': { colorDark: '#559c54', colorLight: '#326d31' },
};

const category = (name: string, groupName: string, description: string) => {
  const slug = slugify(name);
  return {
    id: slug,
    name,
    slug,
    description,
    groupName,
    groupColors: COLORS[groupName],
    editHref: groupedValuesHref('category', {}, { edit: slug }),
  };
};

const FORM_GROUPS: readonly GroupedValueGroupOption[] = [
  { slug: 'fixture-mineral', name: 'Fixture Mineral' },
  { slug: 'fixture-substance', name: 'Fixture Substance' },
];

const form = (name: string, groupName: string, description: string) => {
  const slug = formSlug(name, groupName);
  return {
    id: slug,
    name,
    slug,
    description,
    groupName,
    editHref: groupedValuesHref('form', {}, { edit: slug }),
  };
};

const TRADITIONS: readonly GroupedValueGroupOption[] = [
  { slug: 'fixtural', name: 'Fixtural' },
  { slug: 'mockish', name: 'Mockish' },
];

const deity = (name: string, groupName: string, description: string) => {
  const slug = deitySlug(name, groupName);
  return {
    id: slug,
    name,
    slug,
    description,
    groupName,
    editHref: groupedValuesHref('deity', {}, { edit: slug }),
  };
};

export const CategoriesOnePageOfSeveral: Story = () => (
  <GroupedValueList
    kind="category"
    values={[
      category('Testcraft', 'Fixture Protection', 'An invented category, for the workshop.'),
      category('Testward', 'Fixture Protection', 'Another, guarding nothing in particular.'),
      category('Fixture Mending', 'Fixture Healing', 'Invented too.'),
    ]}
    filter={NO_FILTER}
    groups={CATEGORY_GROUPS}
    previousHref={groupedValuesHref('category', { before: 'cursor' })}
    nextHref={groupedValuesHref('category', { after: 'cursor' })}
  />
);

// Next alone still sits at the right, where it is on every other page.
export const CategoriesFirstPage: Story = () => (
  <GroupedValueList
    kind="category"
    values={[
      category('Testcraft', 'Fixture Protection', 'An invented category, for the workshop.'),
    ]}
    filter={NO_FILTER}
    groups={CATEGORY_GROUPS}
    nextHref={groupedValuesHref('category', { after: 'cursor' })}
  />
);

// Narrowed by part of a name and by a group (MB.178): the form shows both.
export const CategoriesFiltered: Story = () => (
  <GroupedValueList
    kind="category"
    values={[
      category('Testcraft', 'Fixture Protection', 'An invented category, for the workshop.'),
      category('Testward', 'Fixture Protection', 'Another, guarding nothing in particular.'),
    ]}
    filter={{ query: 'test', group: 'fixture-protection' }}
    groups={CATEGORY_GROUPS}
  />
);

export const CategoriesNoMatch: Story = () => (
  <GroupedValueList
    kind="category"
    values={[]}
    filter={{ query: 'nothing', group: 'fixture-healing' }}
    groups={CATEGORY_GROUPS}
  />
);

export const CategoriesEmpty: Story = () => (
  <GroupedValueList kind="category" values={[]} filter={NO_FILTER} groups={CATEGORY_GROUPS} />
);

export const FormsOnePageOfSeveral: Story = () => (
  <GroupedValueList
    kind="form"
    values={[
      form('Testwort Shard', 'Fixture Mineral', 'An invented form, for the workshop.'),
      form('Testwort Sliver', 'Fixture Substance', 'Another, thinner than the first.'),
      form('Fixture Flake', 'Fixture Mineral', 'Invented too.'),
    ]}
    filter={NO_FILTER}
    groups={FORM_GROUPS}
    previousHref={groupedValuesHref('form', { before: 'cursor' })}
    nextHref={groupedValuesHref('form', { after: 'cursor' })}
    position={{ page: 2, pages: 3 }}
  />
);

export const FormsFirstPage: Story = () => (
  <GroupedValueList
    kind="form"
    values={[form('Testwort Shard', 'Fixture Mineral', 'An invented form, for the workshop.')]}
    filter={NO_FILTER}
    groups={FORM_GROUPS}
    nextHref={groupedValuesHref('form', { after: 'cursor' })}
    position={{ page: 1, pages: 2 }}
  />
);

export const FormsFiltered: Story = () => (
  <GroupedValueList
    kind="form"
    values={[
      form('Testwort Shard', 'Fixture Mineral', 'An invented form, for the workshop.'),
      form('Fixture Shard', 'Fixture Mineral', 'Invented too.'),
    ]}
    filter={{ query: 'shard', group: 'fixture-mineral' }}
    groups={FORM_GROUPS}
  />
);

export const FormsNoMatch: Story = () => (
  <GroupedValueList
    kind="form"
    values={[]}
    filter={{ query: 'nothing', group: 'fixture-substance' }}
    groups={FORM_GROUPS}
  />
);

export const FormsEmpty: Story = () => (
  <GroupedValueList kind="form" values={[]} filter={NO_FILTER} groups={FORM_GROUPS} />
);

// By tradition then name, as the service reads them.
export const DeitiesOnePageOfSeveral: Story = () => (
  <GroupedValueList
    kind="deity"
    values={[
      deity('Fixturo', 'Fixtural', 'Another, keeper of nothing in particular.'),
      deity('Testra', 'Fixtural', 'An invented deity, for the workshop.'),
      deity('Mockra', 'Mockish', 'Invented too.'),
    ]}
    filter={NO_FILTER}
    groups={TRADITIONS}
    previousHref={groupedValuesHref('deity', { before: 'cursor' })}
    nextHref={groupedValuesHref('deity', { after: 'cursor' })}
    position={{ page: 2, pages: 3 }}
  />
);

export const DeitiesFirstPage: Story = () => (
  <GroupedValueList
    kind="deity"
    values={[deity('Testra', 'Fixtural', 'An invented deity, for the workshop.')]}
    filter={NO_FILTER}
    groups={TRADITIONS}
    nextHref={groupedValuesHref('deity', { after: 'cursor' })}
    position={{ page: 1, pages: 2 }}
  />
);

export const DeitiesFiltered: Story = () => (
  <GroupedValueList
    kind="deity"
    values={[
      deity('Testra', 'Fixtural', 'An invented deity, for the workshop.'),
      deity('Fixtra', 'Fixtural', 'Invented too.'),
    ]}
    filter={{ query: 'tra', group: 'fixtural' }}
    groups={TRADITIONS}
  />
);

export const DeitiesNoMatch: Story = () => (
  <GroupedValueList
    kind="deity"
    values={[]}
    filter={{ query: 'nothing', group: 'mockish' }}
    groups={TRADITIONS}
  />
);

export const DeitiesEmpty: Story = () => (
  <GroupedValueList kind="deity" values={[]} filter={NO_FILTER} groups={TRADITIONS} />
);

// The flat kinds (MB.95): no group column and no group filter.
const flat = (kind: 'planet' | 'zodiacSign', name: string, description: string) => {
  const slug = slugify(name);
  return {
    id: slug,
    name,
    slug,
    description,
    groupName: '',
    editHref: groupedValuesHref(kind, {}, { edit: slug }),
  };
};

export const PlanetsOnePageOfSeveral: Story = () => (
  <GroupedValueList
    kind="planet"
    values={[
      flat('planet', 'Testwort Star', 'An invented body, for the workshop.'),
      flat('planet', 'Fixture Comet', 'Another, with a longer tail than the first.'),
      flat('planet', 'Fixture Moonlet', 'Invented too.'),
    ]}
    filter={NO_FILTER}
    previousHref={groupedValuesHref('planet', { before: 'cursor' })}
    nextHref={groupedValuesHref('planet', { after: 'cursor' })}
    position={{ page: 2, pages: 3 }}
  />
);

export const Signs: Story = () => (
  <GroupedValueList
    kind="zodiacSign"
    values={[
      flat('zodiacSign', 'Fixture Ram', 'An invented sign, for the workshop.'),
      flat('zodiacSign', 'Fixture Scales', 'Invented too.'),
    ]}
    filter={NO_FILTER}
  />
);

export const PlanetsFiltered: Story = () => (
  <GroupedValueList
    kind="planet"
    values={[flat('planet', 'Testwort Star', 'An invented body, for the workshop.')]}
    filter={{ query: 'star', group: '' }}
  />
);

export const PlanetsNoMatch: Story = () => (
  <GroupedValueList kind="planet" values={[]} filter={{ query: 'nothing', group: '' }} />
);

export const PlanetsEmpty: Story = () => (
  <GroupedValueList kind="planet" values={[]} filter={NO_FILTER} />
);

// At a phone's width in each theme, inside the admin layout: the filter
// stacked, and each row a card.
const Phone = () => (
  <div className="admin-layout">
    <CategoriesOnePageOfSeveral />
  </div>
);

export const PhoneDark: Story = () => <Phone />;
PhoneDark.meta = { theme: 'dark', width: 375 };

export const PhoneLight: Story = () => <Phone />;
PhoneLight.meta = { theme: 'light', width: 375 };

// MB.115's contested calls, each beside today's look so the owner can choose.
// The alternatives are story-only markup and `proposals.scss` rules under a
// wrapper class, never a component prop, so no unchosen path ships. Each is
// shown at desktop and at a phone's width in both themes, inside the admin
// layout as a page draws it.

const AtPhoneWidth = ({ children }: { children: ReactNode }) => (
  <div className="admin-layout">{children}</div>
);

// 1d.6, the table's rows. Banded — every even row on the card surface — is
// today's `.data-table` and the owner's M5.6 call, and the recommendation.
// Hairline drops the bands for a 1px rule in the muted ink under each row,
// the ink the header's rule already wears. At phone width both are cards,
// each on the card surface, so the choice is a desktop one.
const RowsBanded = () => <CategoriesOnePageOfSeveral />;

const RowsHairline = () => (
  <div className="proposal-rows-hairline">
    <CategoriesOnePageOfSeveral />
  </div>
);

export const ProposalRowsBanded: Story = () => <RowsBanded />;

export const ProposalRowsBandedPhoneDark: Story = () => (
  <AtPhoneWidth>
    <RowsBanded />
  </AtPhoneWidth>
);
ProposalRowsBandedPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalRowsBandedPhoneLight: Story = () => (
  <AtPhoneWidth>
    <RowsBanded />
  </AtPhoneWidth>
);
ProposalRowsBandedPhoneLight.meta = { theme: 'light', width: 375 };

export const ProposalRowsHairline: Story = () => <RowsHairline />;

export const ProposalRowsHairlinePhoneDark: Story = () => (
  <AtPhoneWidth>
    <RowsHairline />
  </AtPhoneWidth>
);
ProposalRowsHairlinePhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalRowsHairlinePhoneLight: Story = () => (
  <AtPhoneWidth>
    <RowsHairline />
  </AtPhoneWidth>
);
ProposalRowsHairlinePhoneLight.meta = { theme: 'light', width: 375 };

// 1d.7, the filter at phone width. Stacked — today's `.filter-row`, the query
// on a line of its own and the rest wrapping beneath — is the recommendation.
// Disclosure folds the same form behind a summary naming the filter in force,
// so the table starts higher on a phone, at the cost of a tap to change it.
// The phone pairs are the point; desktop is for completeness.
const DEITY_FILTER: GroupedValueListFilter = { query: 'tra', group: 'fixtural' };

const FILTERED_DEITIES = [
  deity('Testra', 'Fixtural', 'An invented deity, for the workshop.'),
  deity('Fixtra', 'Fixtural', 'Invented too.'),
];

const FilterStacked = () => (
  <GroupedValueList
    kind="deity"
    values={FILTERED_DEITIES}
    filter={DEITY_FILTER}
    groups={TRADITIONS}
  />
);

// The list's own markup, with its filter moved into a `<details>`.
const FilterDisclosure = () => (
  <div className="list-frame grouped-value-list--deity">
    <details className="proposal-filter-disclosure">
      <summary>Filter · Name: tra · Tradition: Fixtural</summary>
      <ValueFilter kind="deity" filter={DEITY_FILTER} groups={TRADITIONS} />
    </details>
    <div className="data-table-frame">
      <table className="data-table data-table--stack" aria-label="Deities" {...tableRole('table')}>
        <thead {...tableRole('rowgroup')}>
          <tr {...tableRole('row')}>
            <th scope="col" {...tableRole('columnheader')}>
              Name
            </th>
            <th scope="col" {...tableRole('columnheader')}>
              Tradition
            </th>
            <th scope="col" {...tableRole('columnheader')}>
              Description
            </th>
            <th scope="col" {...tableRole('columnheader')}>
              <span className="visually-hidden">Edit</span>
            </th>
          </tr>
        </thead>
        <tbody {...tableRole('rowgroup')}>
          {FILTERED_DEITIES.map((entry) => (
            <tr key={entry.id} {...tableRole('row')}>
              <td {...stackCell('Name')}>{entry.name}</td>
              <td {...stackCell('Tradition')}>{entry.groupName}</td>
              <td className="grouped-value-list__description" {...stackCell('Description')}>
                {entry.description}
              </td>
              <td {...stackCell('')}>
                <Link className="btn btn--small btn--quiet" href={entry.editHref}>
                  Edit <span className="visually-hidden">{entry.name}</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <Pager soft />
  </div>
);

export const ProposalFilterStacked: Story = () => <FilterStacked />;

export const ProposalFilterStackedPhoneDark: Story = () => (
  <AtPhoneWidth>
    <FilterStacked />
  </AtPhoneWidth>
);
ProposalFilterStackedPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalFilterStackedPhoneLight: Story = () => (
  <AtPhoneWidth>
    <FilterStacked />
  </AtPhoneWidth>
);
ProposalFilterStackedPhoneLight.meta = { theme: 'light', width: 375 };

export const ProposalFilterDisclosure: Story = () => <FilterDisclosure />;

export const ProposalFilterDisclosurePhoneDark: Story = () => (
  <AtPhoneWidth>
    <FilterDisclosure />
  </AtPhoneWidth>
);
ProposalFilterDisclosurePhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalFilterDisclosurePhoneLight: Story = () => (
  <AtPhoneWidth>
    <FilterDisclosure />
  </AtPhoneWidth>
);
ProposalFilterDisclosurePhoneLight.meta = { theme: 'light', width: 375 };

// 1d.8, the page header's Add at 375px. Wraps — today's `PageHeader`, the
// action beneath the heading at its natural width — is the recommendation.
// Full width stretches the action across the line under the heading, so it
// reads as the page's one primary action, as a narrow form's stacked buttons
// do. Each sits above the real list, so the page reads whole.
const AddPage = () => (
  <>
    <PageHeader
      title="Categories"
      action={
        <Link className="btn btn--solid" href={'/admin/categories?new' as Route}>
          Add Category
        </Link>
      }
    />
    <CategoriesOnePageOfSeveral />
  </>
);

const AddFullWidth = () => (
  <div className="proposal-add-full-width">
    <AddPage />
  </div>
);

export const ProposalAddWraps: Story = () => <AddPage />;

export const ProposalAddWrapsPhoneDark: Story = () => (
  <AtPhoneWidth>
    <AddPage />
  </AtPhoneWidth>
);
ProposalAddWrapsPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalAddWrapsPhoneLight: Story = () => (
  <AtPhoneWidth>
    <AddPage />
  </AtPhoneWidth>
);
ProposalAddWrapsPhoneLight.meta = { theme: 'light', width: 375 };

export const ProposalAddFullWidth: Story = () => <AddFullWidth />;

export const ProposalAddFullWidthPhoneDark: Story = () => (
  <AtPhoneWidth>
    <AddFullWidth />
  </AtPhoneWidth>
);
ProposalAddFullWidthPhoneDark.meta = { theme: 'dark', width: 375 };

export const ProposalAddFullWidthPhoneLight: Story = () => (
  <AtPhoneWidth>
    <AddFullWidth />
  </AtPhoneWidth>
);
ProposalAddFullWidthPhoneLight.meta = { theme: 'light', width: 375 };
