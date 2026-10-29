import { randomBytes } from 'node:crypto';

// The one generator for an invitation's token, on either tier. Not beside `hashToken`, as a service may not import the repository's internals, nor in a module,
// as both identity and coven mint one (claude-docs/db/invitations.md, "Written and read by tier").

/**
 * 32 bytes from the CSPRNG, base64url: 256 bits, unguessable, and safe in a
 * path. Never `Math.random()` (CLAUDE.md, "Invitation tokens").
 */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}
