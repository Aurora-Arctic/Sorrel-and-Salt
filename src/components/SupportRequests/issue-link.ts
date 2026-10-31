import type { IssueLinkRequest } from './types';

// Create Issue is a link to GitHub's new-issue page, filled in; nothing is sent from here, so there is
// no token and no API call. The sender's name and address are never read, as the repository is public.

/** The repository the address paste-back accepts; the support module's `ISSUE_REPOSITORY` says the same. */
export const ISSUE_REPOSITORY_NAME = 'Aurora-Arctic/Sorrel-and-Salt';

/** An issue's address as `owner/repo#number`, or its path past the host when it is not in that shape. */
export function issueLabel(issueUrl: string): string {
  let path: string;
  try {
    path = new URL(issueUrl).pathname;
  } catch {
    return issueUrl;
  }
  const issue = /^\/([^/]+\/[^/]+)\/issues\/(\d+)\/?$/.exec(path);
  return issue ? `${issue[1]}#${issue[2]}` : path.replace(/^\//, '');
}

/** GitHub's new-issue address for `request`, with its subject as the title and the rest in the body. */
export function createIssueHref({ id, subject, message, path }: IssueLinkRequest): string {
  const body = [message, path ? `Page: ${path}` : null, `Support request: ${id}`]
    .filter((part): part is string => part !== null)
    .join('\n\n');
  const query = new URLSearchParams({ title: subject, body });
  return `https://github.com/${ISSUE_REPOSITORY_NAME}/issues/new?${query.toString()}`;
}
