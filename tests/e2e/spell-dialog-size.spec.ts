import { expect } from '@playwright/test';
import { test } from './fixtures';
import { recreateE2eDatabase } from './database';
import { signInAgainAs } from './session';
import { seedCoven } from './stories/coven-ingredients';

// Gate spec for a bug the owner found in M10.12's review: New Spell opened as the heading's
// skeleton, which the server's form then replaced, so the centred dialog grew and jumped up
// under the pointer (518px to 720px at 1280 by 800). Its press now writes the address in the
// browser and the dialog draws the form there, as Add Ingredient's does. Proved by state: from
// the first frame the dialog is open, it already holds the form, and its height never changes.
test.use({ reducedMotion: 'no-preference' });
test.beforeAll(async () => {
  await recreateE2eDatabase();
});

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]) {
  test(`New Spell opens at its full size, the form in its first frame, at ${viewport.width}px`, async ({
    page,
  }) => {
    const coven = await seedCoven(
      page,
      `Fixture Dialog ${viewport.width}`,
      `dialog-${viewport.width}.test`,
      { A: 'owner' },
    );
    await signInAgainAs(page, coven.users.A);
    await page.setViewportSize(viewport);
    await page.goto(`/coven/${coven.slug}/grimoire`);
    await page.getByRole('heading', { name: 'Grimoire', level: 1 }).waitFor();
    // The Filters button exists only once the page has hydrated. Until then the grimoire's
    // filter panel is a `<dialog>` drawn open, and New Spell's press is not yet the script's.
    await expect(page.getByRole('button', { name: /^Filters/ })).toBeVisible();

    // Every frame from the press on: the modal dialog's height, and whether it holds the form.
    // `:modal` matches only a dialog opened over the page, never the filter panel.
    await page.evaluate(() => {
      const w = window as unknown as { frames: { height: number; form: boolean }[] };
      w.frames = [];
      const start = performance.now();
      const tick = () => {
        const dialog = document.querySelector<HTMLDialogElement>('dialog:modal');
        if (dialog) {
          w.frames.push({
            height: Math.round(dialog.getBoundingClientRect().height),
            form: dialog.querySelector('input[name="title"]') !== null,
          });
        }
        if (performance.now() - start < 2000) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.getByRole('link', { name: 'New Spell' }).click();
    await expect(page.getByRole('dialog', { name: 'New Spell' })).toBeVisible();
    await page.waitForTimeout(2100);

    const frames = await page.evaluate(
      () => (window as unknown as { frames: { height: number; form: boolean }[] }).frames,
    );
    // The precondition: the dialog was caught open, over many frames.
    expect(frames.length).toBeGreaterThan(10);
    expect(frames.every(({ form }) => form)).toBe(true);
    expect(new Set(frames.map(({ height }) => height)).size).toBe(1);
  });
}
