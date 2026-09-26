import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromRoot } from '../support/paths';

// Story 1's page exists (M2.6) — Better Auth, the current provider roster
// (Google, Discord, Facebook, Microsoft) and the users table are all live
// (M2.2-M2.6; claude-docs/auth.md, "Social providers"). Story 2 is blocked on
// UI Wave 10 hasn't built yet, and its check reads the route's own source
// rather than importing or rendering it: the page doesn't exist yet, and
// importing one that isn't there would fail typecheck instead of the test it
// belongs to.

describe("Story 1: Sign in with an account I already have, so I don't manage another password.", () => {
  it("offers a sign-in page at /sign-in, DESIGN.md §9's OAuth entry point", () => {
    expect(existsSync(fromRoot('src/app/sign-in/page.tsx'))).toBe(true);
  });
});

describe("Story 2: As a newly signed-in user, be told plainly what I can do next, so an empty account doesn't look broken.", () => {
  it('explains an invite-only account on the post-sign-in landing', () => {
    // `/coven` is DESIGN.md §9's post-sign-in landing, where M2.8 puts its
    // three states — the third being the one that keeps an empty account
    // from reading as broken. `/` is the public front door (MB.57) and says
    // "invite-only" to everyone, so reading it here would prove nothing.
    const landing = fromRoot('src/app/coven/page.tsx');
    expect(existsSync(landing), 'the /coven landing route is not built yet').toBe(true);
    expect(readFileSync(landing, 'utf8')).toMatch(/invite-only/i);
  });
});
