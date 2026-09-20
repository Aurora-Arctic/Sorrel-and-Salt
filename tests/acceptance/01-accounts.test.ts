import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromRoot } from '../support/paths';

// Both stories are blocked on UI Wave 6 hasn't built yet, not on the OAuth
// wiring itself — Better Auth, both providers and the users table are
// already live (M2.2-M2.5; claude-docs/auth.md, "Social providers"). These
// read the route's own source rather than importing or rendering it: the
// pages below don't exist yet, and importing one that isn't there would fail
// typecheck instead of the test it belongs to.

describe("Story 1: Sign in with Google or GitHub, so I don't manage another password.", () => {
  it("offers a sign-in page at /sign-in, DESIGN.md §9's OAuth entry point", () => {
    // Better Auth already issues a real Google/GitHub authorization URL
    // (claude-docs/auth.md) — nobody can reach it until M2.6 builds this page.
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
