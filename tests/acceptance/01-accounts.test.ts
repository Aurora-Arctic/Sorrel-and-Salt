import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromRoot } from '../support/paths';

// Story 2 is blocked on UI Wave 10 hasn't built yet. Story 1's page now
// exists (M2.6) — Better Auth, the current provider roster (Google, Discord,
// Facebook, Microsoft) and the users table are all live (M2.2-M2.6;
// claude-docs/auth.md, "Social providers"). Story 2's check reads the
// route's own source rather than importing or rendering it: the page below
// doesn't exist yet, and importing one that isn't there would fail
// typecheck instead of the test it belongs to.

describe("Story 1: Sign in with an account I already have, so I don't manage another password.", () => {
  it("offers a sign-in page at /sign-in, DESIGN.md §9's OAuth entry point", () => {
    expect(existsSync(fromRoot('src/app/sign-in/page.tsx'))).toBe(true);
  });
});

describe("Story 2: As a newly signed-in user, be told plainly what I can do next, so an empty account doesn't look broken.", () => {
  it('explains an invite-only account instead of the same splash everyone sees', () => {
    // `/` is DESIGN.md §9's post-sign-in landing; today it's identical for
    // every visitor. M2.8 gives it three states, the third being the one
    // that keeps an empty account from reading as broken.
    const home = readFileSync(fromRoot('src/app/page.tsx'), 'utf8');
    expect(home).toMatch(/invite-only/i);
  });
});
