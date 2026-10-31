import type { IssueLinkRequest } from './types';

// Create Issue is a link to GitHub's new-issue page, filled in; nothing is sent from here, so there is
// no token and no API call. The sender's name and address are never read, as the repository is public.

/** The repository the address paste-back accepts; the support module's `ISSUE_REPOSITORY` says the same. */
export const ISSUE_REPOSITORY_NAME = 'Aurora-Arctic/Sorrel-and-Salt';

/** GitHub's new-issue address for `request`, with its subject as the title and the rest in the body. */
export function createIssueHref({ id, subject, message, path }: IssueLinkRequest): string {
  const body = [message, path ? `Page: ${path}` : null, `Support request: ${id}`]
    .filter((part): part is string => part !== null)
    .join('\n\n');
  const query = new URLSearchParams({ title: subject, body });
  return `https://github.com/${ISSUE_REPOSITORY_NAME}/issues/new?${query.toString()}`;
}
