// Client-safe.

import { SITE_ORIGIN } from './site';

export const ERROR_REFERENCE_MAX_LENGTH = 100;

export const PAGE_NOT_ON_SITE = "Start with / or the site's address.";

/** Empty, or a path on this site: one `/` (not `//`, another host) or `SITE_ORIGIN` followed by a path, query or fragment. */
export function isSitePage(value: string): boolean {
  const page = value.trim();
  if (page === '') return true;
  if (page.startsWith('/')) return !page.startsWith('//');
  if (!page.startsWith(SITE_ORIGIN)) return false;
  return page.length === SITE_ORIGIN.length || /^[/?#]/.test(page.slice(SITE_ORIGIN.length));
}

export const ISSUE_REPOSITORY = 'Aurora-Arctic/Sorrel-and-Salt';

export const ISSUE_LINK_EXPECTED =
  'Paste a GitHub issue link, like github.com/Aurora-Arctic/Sorrel-and-Salt/issues/1409, or a link opened from the project board.';

export const ISSUE_LINK_HINT = 'An issue link, or a link opened from the project board.';

/** A project-board link's `issue` parameter reads `owner|repo|number`; null for anything else, or an issue of another repository. */
export function normaliseIssueLink(value: string, repository: string): string | null {
  const text = value.trim();
  const plain = `https://github.com/${repository}/issues/`;
  if (text.startsWith(plain)) {
    return /^[1-9][0-9]*$/.test(text.slice(plain.length)) ? text : null;
  }
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || url.hostname !== 'github.com') return null;
  const owner = repository.split('/')[0];
  if (!new RegExp(`^/orgs/${owner}/projects/[0-9]+(/|$)`).test(url.pathname)) return null;
  const parts = (url.searchParams.get('issue') ?? '').split('|');
  if (parts.length !== 3 || `${parts[0]}/${parts[1]}` !== repository) return null;
  return /^[1-9][0-9]*$/.test(parts[2]) ? `${plain}${parts[2]}` : null;
}

export const SUPPORT_PATH = '/support';

export const SUPPORT_LIST_PATH = '/account/support';

export const supportRequestPath = (id: string) =>
  `${SUPPORT_LIST_PATH}?request=${encodeURIComponent(id)}`;

/** No session: the token rides in the fragment, which a browser never sends. */
export const supportViewPath = (token: string) =>
  `${SUPPORT_PATH}/request#${encodeURIComponent(token)}`;

export const SUPPORT_PARAM = 'support';

export const SUPPORT_ERROR_PARAM = 'error';

export const SUPPORT_REF_PARAM = 'ref';

export function errorReferenceOf(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length <= ERROR_REFERENCE_MAX_LENGTH ? trimmed : undefined;
}

export const SUPPORT_FROM_PARAM = 'from';

export const SUPPORT_ABOUTS = [
  {
    value: 'accessibility',
    label: 'Accessibility',
    description: 'Something you cannot use or read.',
  },
  {
    value: 'bug',
    label: 'Bug',
    description: 'Something is broken or wrong.',
  },
  {
    value: 'account',
    label: 'Account & Sign-In',
    description: 'Signing in, your email or an invitation.',
  },
  {
    value: 'compendium',
    label: 'Compendium Entry',
    description: 'An entry looks wrong or lacks a source.',
  },
  {
    value: 'privacy',
    label: 'Privacy & Data',
    description: 'Your data, or a request about it.',
  },
  {
    value: 'feedback',
    label: 'Feedback',
    description: 'Something you would like changed.',
  },
  {
    value: 'question',
    label: 'Question',
    description: 'Anything else you would like to ask.',
  },
] as const;
export type SupportAboutParam = (typeof SUPPORT_ABOUTS)[number]['value'];

export function supportAboutOf(value: string | null): SupportAboutParam | undefined {
  return SUPPORT_ABOUTS.find((about) => about.value === value)?.value;
}

export function errorCodeOf(value: string | null): number | undefined {
  if (value === null || !/^\d{3}$/.test(value)) return undefined;
  const code = Number(value);
  return code >= 100 && code <= 599 ? code : undefined;
}

export function supportHref(
  pathname: string,
  params: URLSearchParams,
  about?: SupportAboutParam,
  errorCode?: number,
): string {
  const rest = new URLSearchParams(params);
  rest.set(SUPPORT_PARAM, about ?? '');
  if (errorCode === undefined) rest.delete(SUPPORT_ERROR_PARAM);
  else rest.set(SUPPORT_ERROR_PARAM, String(errorCode));
  return `${pathname}?${rest}`;
}

export function supportClosedHref(pathname: string, params: URLSearchParams): string {
  const rest = new URLSearchParams(params);
  rest.delete(SUPPORT_PARAM);
  rest.delete(SUPPORT_ERROR_PARAM);
  rest.delete(SUPPORT_REF_PARAM);
  rest.delete(SUPPORT_FROM_PARAM);
  const lead = rest.toString();
  return lead ? `${pathname}?${lead}` : pathname;
}

/** The first three hold open requests, told apart by who holds them; the rest are one status each. */
export const SUPPORT_VIEWS = [
  { value: 'needs_staff', label: 'Needs Staff' },
  { value: 'mine', label: 'Mine' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'waiting', label: 'Waiting on Sender' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
] as const;
export type SupportView = (typeof SUPPORT_VIEWS)[number]['value'];

export const DEFAULT_SUPPORT_VIEW: SupportView = 'needs_staff';

/** A sender may be in several, so each is a narrowing of its own rather than a rank. */
export const SUPPORT_SENDER_GROUPS = [{ value: 'beta_tester', label: 'Beta Testers' }] as const;
export type SupportSenderGroup = (typeof SUPPORT_SENDER_GROUPS)[number]['value'];
