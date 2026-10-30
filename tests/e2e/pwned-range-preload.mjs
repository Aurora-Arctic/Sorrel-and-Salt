import { createHash } from 'node:crypto';
import { BREACHED_PASSWORD } from './pwned-range.mjs';

// Loaded into every e2e server through NODE_OPTIONS (tests/e2e/servers.ts), so a password check answers from here
// and never reaches the real Have I Been Pwned service. Better Auth's plugin hardcodes the service's URL, so the
// server's fetch is wrapped rather than pointed elsewhere; every other request passes through untouched.

const RANGE = 'https://api.pwnedpasswords.com/range/';
const breachedHash = createHash('sha1')
  .update(BREACHED_PASSWORD, 'utf8')
  .digest('hex')
  .toUpperCase();
const passThrough = globalThis.fetch;

globalThis.fetch = async function fetch(input, init) {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (!url.startsWith(RANGE)) return passThrough(input, init);
  const prefix = url.slice(RANGE.length).toUpperCase();
  const lines = [`${'0'.repeat(35)}:0`];
  if (breachedHash.startsWith(prefix)) lines.unshift(`${breachedHash.slice(5)}:52`);
  return new Response(lines.join('\r\n'), { headers: { 'content-type': 'text/plain' } });
};
