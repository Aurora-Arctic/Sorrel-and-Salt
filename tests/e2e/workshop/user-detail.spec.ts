import { expect, test, type Locator, type Page } from '@playwright/test';

// The user modal's Change Role and Approve, refused, say so in the click
// feedback's callout under the control rather than a notice in the dialog
// (the owner's exception to M12.31's rule 6, 2026-10-20;
// claude-docs/components/user-detail.md). Measured in the story, where every
// press is refused, since the workshop serves no GraphQL: the callout must
// stand over the dialog's content, clipped by none of its boxes, and Escape
// must close it and leave the dialog open. What it says and where the focus
// goes are in tests/components/UserDetail.

const WIDTHS = [1280, 375] as const;

async function openDialog(page: Page, width: number): Promise<Locator> {
  await page.setViewportSize({ width, height: 800 });
  await page.goto(
    '/iframe.html?id=admin-user-detail--in-a-modal&viewMode=story&globals=theme:dark',
  );
  const dialog = page.getByRole('dialog', { name: 'Bo Fixturewort' });
  await expect(dialog).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  return dialog;
}

const CONTROLS = [
  {
    name: 'Change Role',
    control: 'Change Role for Bo Fixturewort',
    async confirm(dialog: Locator) {
      await dialog.getByRole('radio', { name: /^Curator/ }).check();
      await dialog.getByRole('button', { name: 'Promote', exact: true }).click();
    },
  },
  {
    name: 'Approve',
    control: 'Approve Bo Fixturewort',
    async confirm(dialog: Locator) {
      await dialog.getByRole('button', { name: 'Approve', exact: true }).click();
    },
  },
] as const;

/** Every corner and the middle of `alert` is the callout itself at that point: nothing covers or clips it. */
async function expectOnTop(alert: Locator) {
  const hits = await alert.evaluate((node) => {
    const { left, right, top, bottom } = node.getBoundingClientRect();
    const inset = 3;
    const points: [number, number][] = [
      [(left + right) / 2, (top + bottom) / 2],
      [left + inset, top + inset],
      [right - inset, top + inset],
      [left + inset, bottom - inset],
      [right - inset, bottom - inset],
    ];
    return points.map(([x, y]) => {
      const hit = document.elementFromPoint(x, y);
      return hit !== null && node.contains(hit);
    });
  });
  expect(hits).toEqual([true, true, true, true, true]);
}

for (const width of WIDTHS) {
  for (const { name, control, confirm } of CONTROLS) {
    test(`${name} refused in the dialog at ${width}px: the callout over the dialog, Escape closing it alone`, async ({
      page,
    }) => {
      const dialog = await openDialog(page, width);
      const button = dialog.getByRole('button', { name: control, exact: true });
      await button.click();
      await confirm(dialog);

      const alert = page.getByRole('alert');
      // Visible only once placed: until then it is hidden.
      await expect(alert).toBeVisible();
      // In the dialog, under the control, and no notice beside it.
      await expect(dialog.getByRole('alert')).toHaveCount(1);
      await expect(dialog.locator('.notice')).toHaveCount(0);
      const at = await button.boundingBox();
      const under = await alert.boundingBox();
      expect(under!.y).toBeGreaterThan(at!.y + at!.height);
      expect(under!.x).toBeGreaterThanOrEqual(0);
      expect(under!.x + under!.width).toBeLessThanOrEqual(width);
      // Inside the dialog's box, not merely the window's.
      const box = await dialog.boundingBox();
      expect(under!.x).toBeGreaterThanOrEqual(box!.x);
      expect(under!.x + under!.width).toBeLessThanOrEqual(box!.x + box!.width);
      await expectOnTop(alert);

      // Escape closes the callout, not the dialog; the focus back on the control.
      await expect(button).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(alert).toHaveCount(0);
      await expect(dialog).toBeVisible();
      await expect(button).toBeFocused();

      // The badge reopens it; a press elsewhere in the dialog closes it.
      const badge = dialog.getByRole('button', { name: /^Show the error for / });
      await badge.click();
      await expect(alert).toBeVisible();
      await dialog.getByRole('heading', { name: 'Bo Fixturewort' }).click();
      await expect(alert).toHaveCount(0);
      await expect(dialog).toBeVisible();
      await expect(badge).toBeVisible();

      // The next press clears it.
      await button.click();
      await expect(badge).toHaveCount(0);
      await expect(alert).toHaveCount(0);
    });
  }
}

// As the owner reviews it: the story in Storybook's own page rather than its bare
// preview, where the story is drawn into an iframe by the page around it. The
// callout must find its dialog across that boundary, at the widths a review is
// held at. Not at a phone's: there the page shows the story in a strip too short
// to press in, and the bare preview above stands for the phone.
const SIZES = [
  [1512, 982],
  [1440, 900],
  [1280, 800],
  [1024, 800],
  [768, 900],
] as const;

for (const [width, height] of SIZES) {
  for (const { name, control, confirm } of CONTROLS) {
    test(`${name} refused in Storybook's frame at ${width}×${height}: the callout inside the dialog`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/?path=/story/admin-user-detail--in-a-modal&globals=theme:dark');
      const frame = page.frameLocator('#storybook-preview-iframe').first();
      const dialog = frame.getByRole('dialog', { name: 'Bo Fixturewort' });
      // A fresh `storybook dev` compiles the first story on its first load, and in CI
      // that takes longer than the 5 s default.
      await expect(dialog).toBeVisible({ timeout: 30_000 });
      const button = dialog.getByRole('button', { name: control, exact: true });
      await button.click();
      await confirm(dialog);

      const alert = frame.getByRole('alert');
      // Visible only once placed: until then it is hidden.
      await expect(alert).toBeVisible();
      const at = (await button.boundingBox())!;
      const under = (await alert.boundingBox())!;
      const box = (await dialog.boundingBox())!;
      test.info().annotations.push({
        type: 'measured',
        description: JSON.stringify({
          width,
          name,
          calloutRight: under.x + under.width,
          buttonRight: at.x + at.width,
          dialogRight: box.x + box.width,
          calloutLeft: under.x,
          dialogLeft: box.x,
        }),
      });

      expect(under.x).toBeGreaterThanOrEqual(box.x);
      expect(under.x + under.width).toBeLessThanOrEqual(box.x + box.width);
    });
  }
}

// In Storybook's frame the callout's listeners must hear the frame's own keys and
// presses, not the page's around it: Escape closes the callout alone, and a
// press elsewhere in the dialog closes it.
for (const { name, control, confirm } of CONTROLS) {
  test(`${name} refused in Storybook's frame: Escape closes the callout alone, a press elsewhere in the dialog closes it`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/?path=/story/admin-user-detail--in-a-modal&globals=theme:dark');
    const frame = page.frameLocator('#storybook-preview-iframe').first();
    const dialog = frame.getByRole('dialog', { name: 'Bo Fixturewort' });
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    const button = dialog.getByRole('button', { name: control, exact: true });
    await button.click();
    await confirm(dialog);
    const alert = frame.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(button).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(alert).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(button).toBeFocused();

    const badge = dialog.getByRole('button', { name: /^Show the error for / });
    await badge.click();
    await expect(alert).toBeVisible();
    await dialog.getByRole('heading', { name: 'Bo Fixturewort' }).click();
    await expect(alert).toHaveCount(0);
    await expect(dialog).toBeVisible();
  });
}
