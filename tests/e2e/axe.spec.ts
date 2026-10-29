import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';

test('a seeded violation fails the scan', async ({ page }) => {
  await page.setContent(
    '<html><head><title>Fixture</title></head><body><img src="x.png"></body></html>',
  );
  await expect(assertNoAccessibilityViolations(page)).rejects.toThrow();
});

// A soft navigation removes the <title> and puts the next one back a
// moment later. The scan waits for it rather than reporting a page that has one.
test('a title that is briefly absent does not fail the scan', async ({ page }) => {
  await page.setContent(
    '<html lang="en"><head><title>Fixture</title></head><body><main><h1>Fixture</h1></main></body></html>',
  );
  await page.evaluate(() => {
    document.title = '';
    document.querySelector('title')?.remove();
    setTimeout(() => {
      document.head.append(
        Object.assign(document.createElement('title'), { textContent: 'Fixture' }),
      );
    }, 400);
  });
  await assertNoAccessibilityViolations(page);
});
