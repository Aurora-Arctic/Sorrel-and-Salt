import { createHash } from 'node:crypto';

/**
 * The hash a link's token is stored and matched as: hex SHA-256. Unsalted and
 * fast on purpose, since a token is `crypto.randomBytes` output rather than a
 * password and has no dictionary to resist. Inside the repository, so a
 * caller hands over the token and never holds the hash: a dumped row's hash
 * matches no call (claude-docs/db/invitations.md, "Admin invitations").
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
