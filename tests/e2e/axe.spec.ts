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

// A soft navigation's metadata swap can land between the wait for a title and the scan's read of
// it, so the scan itself finds none. The document here reads a title for
// the wait (which reads the element, not this),
// none for the scan's first read, and a title again after: a gap that closed on its
// own, which the scan must not report. The count, not a timer, puts the gap where the race is.
test('a title that goes absent after the wait does not fail the scan', async ({ page }) => {
  await page.setContent(
    '<html lang="en"><head><title>Fixture</title></head><body><main><h1>Fixture</h1></main></body></html>',
  );
  await page.evaluate(() => {
    const real = Object.getOwnPropertyDescriptor(Document.prototype, 'title');
    let reads = 0;
    Object.defineProperty(document, 'title', {
      configurable: true,
      get() {
        reads += 1;
        return reads === 1 ? '' : (real?.get?.call(document) ?? '');
      },
    });
  });
  await assertNoAccessibilityViolations(page);
});
