import { createHash } from 'node:crypto';

/**
 * The hash a link's token is stored and matched as: hex SHA-256, unsalted as a token is `crypto.randomBytes` output with no dictionary to
 * resist. Inside the repository, so a caller never holds the hash (claude-docs/db/invitations.md, "Written and read by tier").
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
