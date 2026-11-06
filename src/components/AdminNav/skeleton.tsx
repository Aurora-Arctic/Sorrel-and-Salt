import type { ReactNode } from 'react';
import { KINDS as VALUE_KINDS } from '../GroupedValueList/kinds';
import { ListBodySkeleton, ListSkeleton } from '../ListFrame/skeleton';
import Skeleton from '../Skeleton';
import { PanelSkeleton } from '../Skeleton/panel';
import TabbedPage from '../TabbedPage';
import type { PageTab } from '../TabbedPage/types';
import { ADMIN_PAGES } from './sections';
import type { AdminPage } from './types';

// What each admin tab draws in its panel while it is on its way, by the tab's address: the page's
// own filter row and table headings, so the list keeps its place when the rows arrive.
const valueHeadings = (kind: keyof typeof VALUE_KINDS): string[] => {
  const { group } = VALUE_KINDS[kind];
  return ['Name', ...(group ? [group.label] : []), 'Description', 'Edit'];
};

const valuePanel = (kind: keyof typeof VALUE_KINDS): ReactNode => (
  <ListSkeleton
    filter={`Filter ${VALUE_KINDS[kind].title}`}
    label={VALUE_KINDS[kind].title}
    headings={valueHeadings(kind)}
    actions={['Edit']}
  />
);

const groupPanel = (label: string): ReactNode => (
  <ListBodySkeleton
    label={label}
    headings={['Name', 'Description', 'Edit']}
    actions={['Edit']}
    count={4}
  />
);

const documentPanel: ReactNode = (
  <>
    <Skeleton shape="line" count={2} quiet />
    <Skeleton shape="block" count={2} quiet />
  </>
);

const PANELS: Record<string, ReactNode> = {
  '/curator/compendium': (
    <ListSkeleton
      filter="Filter Compendium"
      label="Compendium"
      headings={[
        'Name',
        'Formal Name',
        'Classification',
        'Form',
        'Categories',
        'Sourcing Score',
        'Edit',
      ]}
      actions={['Edit']}
    />
  ),
  [VALUE_KINDS.category.path]: valuePanel('category'),
  '/curator/category-groups': groupPanel('Category Groups'),
  [VALUE_KINDS.form.path]: valuePanel('form'),
  '/curator/form-groups': groupPanel('Form Groups'),
  [VALUE_KINDS.deity.path]: valuePanel('deity'),
  '/curator/deity-traditions': groupPanel('Traditions'),
  [VALUE_KINDS.celestialBody.path]: valuePanel('celestialBody'),
  [VALUE_KINDS.zodiacSign.path]: valuePanel('zodiacSign'),
  '/keepers/users': (
    <ListSkeleton
      filter="Filter Users"
      label="Users"
      headings={[
        'Name',
        'Email',
        'Role',
        'Can Create',
        'Support',
        'Access',
        'Logins',
        'Terms',
        'Signed Up',
        'Impersonate',
      ]}
      actions={['Impersonate']}
    />
  ),
  '/keepers/privilege-changes': (
    <ListSkeleton
      filter="Filter Privilege Changes"
      label="Privilege Changes"
      headings={['When', 'User', 'Privilege', 'Change', 'How', 'Changed By', 'Note']}
    />
  ),
  '/keepers/invitations': (
    <ListBodySkeleton
      label="Invitations"
      headings={['Email', 'Role', 'Reason', 'Expires', 'Revoke']}
      actions={['Revoke']}
      count={4}
    />
  ),
  '/keepers/invitation-cards': (
    <ListBodySkeleton
      label="Invitation Cards"
      headings={[
        'Batch',
        'Status',
        'Cards',
        'Accepted',
        'Refused Opens',
        'Minted On',
        'Expires',
        'Revoke',
      ]}
      actions={['Revoke']}
      count={4}
    />
  ),
  '/keepers/card-sign-ups': (
    <ListBodySkeleton
      label="Card Sign-Ups"
      headings={['Name', 'Email', 'Accepted On', 'Batch', 'Covens Owned']}
      count={4}
    />
  ),
  '/keepers/support': (
    <ListSkeleton
      filter="Filter Support Requests"
      label="Support Requests"
      headings={[
        'About',
        'Subject',
        'Status',
        'Sender',
        'Assignee',
        'Curators',
        'Error #',
        'Created',
        'Last From Sender',
      ]}
    />
  ),
  '/keepers/documents/terms': documentPanel,
  '/keepers/documents/disclaimer': documentPanel,
  '/keepers/documents/code-of-ethics': documentPanel,
  '/keepers/documents/privacy': documentPanel,
  '/keepers/documents': <PanelSkeleton fields={2} />,
};

/** The tabs of an admin page with each one's panel placeholder, for its tabbed layout. */
export const withSkeletons = (tabs: AdminPage['tabs']): PageTab[] =>
  tabs.map((tab) => ({ ...tab, skeleton: PANELS[tab.href] }));

/** An admin page with the tab at `open` pressed, drawn in the body while the page is on its way. */
export const AdminPageSkeleton = ({
  page,
  open,
  tabsBelow,
}: {
  page: keyof typeof ADMIN_PAGES;
  open: string;
  tabsBelow?: boolean;
}) => (
  <TabbedPage
    as="div"
    title={ADMIN_PAGES[page].label}
    tabs={withSkeletons(ADMIN_PAGES[page].tabs)}
    open={open}
    tabsBelow={tabsBelow}
  >
    {PANELS[open]}
  </TabbedPage>
);
