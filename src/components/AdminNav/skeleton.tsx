import type { ReactNode } from 'react';
import { AdminCardsSkeleton, CardArrivalsSkeleton } from '../AdminCards/skeleton';
import { AdminInvitationsSkeleton } from '../AdminInvitations/skeleton';
import { BusinessCardsBodySkeleton } from '../BusinessCards/skeleton';
import { CompendiumListSkeleton } from '../CompendiumList/skeleton';
import { DocumentEditorSkeleton } from '../DocumentEditor/skeleton';
import { DocumentMailingSkeleton } from '../DocumentMailingPanel/skeleton';
import { GroupListSkeleton } from '../GroupList/skeleton';
import { HelpOutlineSkeleton } from '../HelpOutline/skeleton';
import { KINDS as GROUP_KINDS } from '../GroupList/kinds';
import ActionFace, { ButtonFace } from '../ActionFace';
import { impersonationEnabled } from '../../lib/impersonation';
import { GroupedValueListSkeleton } from '../GroupedValueList/skeleton';
import { KINDS as VALUE_KINDS } from '../GroupedValueList/kinds';
import { PrivilegeLedgerSkeleton } from '../PrivilegeLedger/skeleton';
import { UserListSkeleton } from '../UserList/skeleton';
import { SupportListSkeleton } from '../SupportRequests/skeleton';
import PageHeader from '../PageHeader';
import TabbedPage from '../TabbedPage';
import type { PageTab } from '../TabbedPage/types';
import { ADMIN_PAGES } from './sections';
import type { AdminPage } from './types';
import { ADD_INGREDIENT_TITLE } from '../AppShell/add-href';

const documentPanel: ReactNode = <DocumentEditorSkeleton />;

// What each admin tab draws in its panel while it is on its way, by the tab's address: the page's own
// filter row and table headings, so the list keeps its place when the rows arrive. A function, since the
// Users table's columns follow the environment.
const panels = (): Record<string, ReactNode> => ({
  '/curator/compendium': <CompendiumListSkeleton />,
  [VALUE_KINDS.category.path]: <GroupedValueListSkeleton kind="category" />,
  [GROUP_KINDS.category.path]: <GroupListSkeleton kind="category" />,
  [VALUE_KINDS.form.path]: <GroupedValueListSkeleton kind="form" />,
  [GROUP_KINDS.form.path]: <GroupListSkeleton kind="form" />,
  [VALUE_KINDS.deity.path]: <GroupedValueListSkeleton kind="deity" />,
  [GROUP_KINDS.tradition.path]: <GroupListSkeleton kind="tradition" />,
  [VALUE_KINDS.celestialBody.path]: <GroupedValueListSkeleton kind="celestialBody" />,
  [VALUE_KINDS.zodiacSign.path]: <GroupedValueListSkeleton kind="zodiacSign" />,
  '/keepers/users': <UserListSkeleton canImpersonate={impersonationEnabled()} />,
  '/keepers/privilege-changes': <PrivilegeLedgerSkeleton />,
  '/keepers/invitations': <AdminInvitationsSkeleton />,
  '/keepers/invitation-cards': <AdminCardsSkeleton />,
  '/keepers/card-sign-ups': <CardArrivalsSkeleton />,
  '/keepers/support': <SupportListSkeleton />,
  '/keepers/business-cards': <BusinessCardsBodySkeleton />,
  '/keepers/documents/terms': documentPanel,
  '/keepers/documents/disclaimer': documentPanel,
  '/keepers/documents/about': documentPanel,
  '/keepers/documents/code-of-ethics': documentPanel,
  '/keepers/documents/privacy': documentPanel,
  '/keepers/documents': <DocumentMailingSkeleton />,
  '/keepers/help': <HelpOutlineSkeleton />,
});

// The header action each tab carries, drawn with nothing to press: the Add of the curator tabs, and the
// keeper tabs' own button.
const ACTIONS: Record<string, ReactNode> = {
  '/curator/compendium': <ActionFace>{ADD_INGREDIENT_TITLE}</ActionFace>,
  ...Object.fromEntries(
    Object.values(VALUE_KINDS).map((kind) => [
      kind.path,
      <ActionFace key={kind.path}>{`Add ${kind.label}`}</ActionFace>,
    ]),
  ),
  ...Object.fromEntries(
    Object.values(GROUP_KINDS).map((kind) => [
      kind.path,
      <ActionFace key={kind.path}>{kind.add}</ActionFace>,
    ]),
  ),
  // The pause switch is a bare wrapper for a keeper who may not flip it, which sets the header's height.
  '/keepers/users': <div className="user-list__pause" />,
  '/keepers/invitations': <ButtonFace link>New Invitation</ButtonFace>,
  '/keepers/invitation-cards': <ButtonFace link>Mint Cards</ButtonFace>,
  '/keepers/card-sign-ups': <ButtonFace>Download CSV</ButtonFace>,
  '/keepers/help': <ActionFace>Add Help Article</ActionFace>,
};

/** The tabs of an admin page with each one's panel placeholder, for its tabbed layout. */
export const withSkeletons = (tabs: AdminPage['tabs']): PageTab[] =>
  tabs.map((tab) => ({ ...tab, skeleton: panels()[tab.href] }));

/** An admin page with the tab at `open` pressed, drawn in the body while the page is on its way. */
export const AdminPageSkeleton = ({
  page,
  open,
  tabsBelow,
}: {
  page: keyof typeof ADMIN_PAGES;
  open: string;
  tabsBelow?: boolean;
}) =>
  // A page of one tab is drawn by its page with a plain heading, not the tabbed frame.
  ADMIN_PAGES[page].tabs.length === 1 ? (
    <>
      <PageHeader title={ADMIN_PAGES[page].label} action={ACTIONS[open]} />
      {panels()[open]}
    </>
  ) : (
    <TabbedPage
      as="div"
      title={ADMIN_PAGES[page].label}
      tabs={withSkeletons(ADMIN_PAGES[page].tabs)}
      open={open}
      tabsBelow={tabsBelow}
      action={ACTIONS[open]}
    >
      {panels()[open]}
    </TabbedPage>
  );
