import type { Route } from 'next';
import type { PageTab } from '@/components/TabbedPage/types';
import { ACCOUNT_PATH, ACCOUNT_SIGN_IN_PATH } from '@/lib/sign-in';
import { SUPPORT_LIST_PATH } from '@/lib/support-path';
import {
  AccountPanelSkeleton,
  AccountSignInPanelSkeleton,
  AccountSupportPanelSkeleton,
} from './panels';

/** The account page's tabs, in their order along the row, each with its panel's placeholder. */
export const ACCOUNT_TABS: readonly PageTab[] = [
  { href: ACCOUNT_PATH as Route, label: 'Account', skeleton: <AccountPanelSkeleton /> },
  {
    href: ACCOUNT_SIGN_IN_PATH as Route,
    label: 'Sign-In',
    skeleton: <AccountSignInPanelSkeleton />,
  },
  {
    href: SUPPORT_LIST_PATH as Route,
    label: 'Support Requests',
    skeleton: <AccountSupportPanelSkeleton />,
  },
];
