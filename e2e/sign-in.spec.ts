import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';

// /sign-in touches no database — unlike smoke.spec.ts, no
// test.describe.configure({ mode: 'serial' }) or recreateE2eDatabase() is
// needed here (claude-docs/testing.md, "E2E — Playwright").
//
// The default server blanks every provider's credentials
// (playwright.config.ts), so every button renders greyed via
// .btn[aria-disabled='true'] — exactly the state these tests exercise, with
// or without a developer's .env.local. The brand-coloured state is
// sign-in-configured-providers.spec.ts's. A live OAuth round trip is MB.12's
// job, run by hand against real credentials, not something CI can assert.
const PROVIDER_NAMES = ['Discord', 'Google', 'Facebook', 'Microsoft'];

test('sign-in page offers every roster provider, reachable by keyboard', async ({ page }) => {
  await page.goto('/sign-in');
  await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();

  for (const name of PROVIDER_NAMES) {
    const button = page.getByRole('button', { name: `Continue with ${name}` });
    await expect(button).toBeVisible();
    // Pins the greyed state: a server that picked up credentials would pass
    // the scans below on a page these tests are not about.
    await expect(button).toHaveAttribute('aria-disabled', 'true');
  }

  // "Reachable by keyboard" means real Tab navigation reaches every one —
  // aria-disabled (not the disabled attribute) is what keeps a greyed
  // button in the tab order in the first place
  // (claude-docs/components/sign-in-panel.md, "Unavailable providers").
  const focusedNames = new Set<string>();
  // ThemeToggle (global layout) plus the four provider buttons; a few spare
  // presses tolerate an extra tab stop without under-covering the roster.
  for (let i = 0; i < PROVIDER_NAMES.length + 3; i++) {
    await page.keyboard.press('Tab');
    const text = await page.evaluate(() => document.activeElement?.textContent?.trim());
    if (text) focusedNames.add(text);
  }

  for (const name of PROVIDER_NAMES) {
    expect([...focusedNames].some((text) => text.includes(name))).toBe(true);
  }
});

test('sign-in page has no accessibility violations', async ({ page }) => {
  await page.goto('/sign-in');
  await assertNoAccessibilityViolations(page);
});

// The error state's markup — a role="alert" region — is otherwise unseen by
// axe.spec.ts's seeded-violation check, so it gets its own scan.
test('a failed-callback error state has no accessibility violations', async ({ page }) => {
  await page.goto('/sign-in?error=access_denied');
  // Scoped to the page's own <main>: Next portals an empty role="alert"
  // route announcer into <body> on every page, so a bare getByRole('alert')
  // matches two elements and fails strict mode.
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible();
  await assertNoAccessibilityViolations(page);
});
