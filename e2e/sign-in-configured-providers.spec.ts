import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';

// Runs only in the `chromium-configured-providers` project, against a server
// whose four providers carry placeholder credentials — the brand-coloured
// state a real user sees, which sign-in.spec.ts's greyed server never
// renders. claude-docs/components/sign-in-panel.md, "Testing".
const PROVIDER_NAMES = ['Discord', 'Google', 'Facebook', 'Microsoft'];

// The placeholder ids are useless to a real authorization endpoint, so
// nothing here may start a sign-in. Hovering is the whole interaction; this
// catches a click that a later edit adds by mistake.
let signInRequests: string[];

test.beforeEach(async ({ page }) => {
  signInRequests = [];
  await page.route('**/api/auth/sign-in/**', async (route) => {
    signInRequests.push(route.request().url());
    await route.abort();
  });
});

test.afterEach(() => {
  expect(signInRequests, 'a test started a sign-in against placeholder credentials').toEqual([]);
});

// The precondition every scan below rests on: without it, a server that
// silently fell back to the greyed state would pass them all, which is the
// exact gap this project exists to close.
test('every provider renders available, not greyed', async ({ page }) => {
  await page.goto('/sign-in');
  for (const name of PROVIDER_NAMES) {
    await expect(page.getByRole('button', { name: `Continue with ${name}` })).not.toHaveAttribute(
      'aria-disabled',
    );
  }
  await expect(page.getByText('Not available right now.')).toHaveCount(0);
});

test('sign-in page with every provider configured has no accessibility violations', async ({
  page,
}) => {
  await page.goto('/sign-in');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).not.toHaveAttribute(
    'aria-disabled',
  );
  await assertNoAccessibilityViolations(page);
});

for (const name of PROVIDER_NAMES) {
  test(`Continue with ${name}'s hover state has no accessibility violations`, async ({ page }) => {
    await page.goto('/sign-in');
    const button = page.getByRole('button', { name: `Continue with ${name}` });
    await expect(button).not.toHaveAttribute('aria-disabled');

    const background = () => button.evaluate((el) => getComputedStyle(el).backgroundColor);
    const resting = await background();
    await button.hover();
    // Proves axe sees the hover colour rather than the resting one.
    await expect.poll(background).not.toBe(resting);

    await assertNoAccessibilityViolations(page);
  });
}
