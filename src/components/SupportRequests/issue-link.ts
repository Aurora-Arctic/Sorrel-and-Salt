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
