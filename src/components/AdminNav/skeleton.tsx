import type { ReactNode } from 'react';
import { AdminCardsBodySkeleton, CardArrivalsBodySkeleton } from '../AdminCards/skeleton';
import { AdminInvitationsBodySkeleton } from '../AdminInvitations/skeleton';
import { CompendiumListBodySkeleton } from '../CompendiumList/skeleton';
import { GroupListBodySkeleton } from '../GroupList/skeleton';
import { KINDS as GROUP_KINDS } from '../GroupList/kinds';
import type { GroupedValueKind } from '../GroupedValueForm/types';
import { GroupedValueListBodySkeleton } from '../GroupedValueList/skeleton';
import { KINDS as VALUE_KINDS } from '../GroupedValueList/kinds';
import { ListFilterFrame } from '../ListFrame/skeleton';
import { PrivilegeLedgerBodySkeleton } from '../PrivilegeLedger/skeleton';
import { UserListBodySkeleton } from '../UserList/skeleton';
import { SupportListSkeleton } from '../SupportRequests/skeleton';
import Skeleton from '../Skeleton';
import { PanelSkeleton } from '../Skeleton/panel';
import TabbedPage from '../TabbedPage';
import type { PageTab } from '../TabbedPage/types';
import { ADMIN_PAGES } from './sections';
import type { AdminPage } from './types';

// What each admin tab draws in its panel while it is on its way, by the tab's address: the page's own
// filter row and table headings, so the list keeps its place when the rows arrive.
const filtered = (filter: string, body: ReactNode): ReactNode => (
  <ListFilterFrame filter={filter}>{body}</ListFilterFrame>
);

const valuePanel = (kind: GroupedValueKind): ReactNode =>
  filtered(`Filter ${VALUE_KINDS[kind].title}`, <GroupedValueListBodySkeleton kind={kind} />);

const documentPanel: ReactNode = (
  <>
    <Skeleton shape="line" count={2} quiet />
    <Skeleton shape="block" count={2} quiet />
  </>
);

const PANELS: Record<string, ReactNode> = {
  '/curator/compendium': filtered('Filter Compendium', <CompendiumListBodySkeleton />),
  [VALUE_KINDS.category.path]: valuePanel('category'),
  [GROUP_KINDS.category.path]: <GroupListBodySkeleton kind="category" />,
  [VALUE_KINDS.form.path]: valuePanel('form'),
  [GROUP_KINDS.form.path]: <GroupListBodySkeleton kind="form" />,
  [VALUE_KINDS.deity.path]: valuePanel('deity'),
  [GROUP_KINDS.tradition.path]: <GroupListBodySkeleton kind="tradition" />,
  [VALUE_KINDS.celestialBody.path]: valuePanel('celestialBody'),
  [VALUE_KINDS.zodiacSign.path]: valuePanel('zodiacSign'),
  '/keepers/users': filtered('Filter Users', <UserListBodySkeleton />),
  '/keepers/privilege-changes': filtered(
    'Filter Privilege Changes',
    <PrivilegeLedgerBodySkeleton />,
  ),
  '/keepers/invitations': <AdminInvitationsBodySkeleton />,
  '/keepers/invitation-cards': filtered('Filter Invitation Cards', <AdminCardsBodySkeleton />),
  '/keepers/card-sign-ups': <CardArrivalsBodySkeleton />,
  '/keepers/support': <SupportListSkeleton />,
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
