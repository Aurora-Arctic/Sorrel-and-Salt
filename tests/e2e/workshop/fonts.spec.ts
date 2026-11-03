import { expect, test } from '@playwright/test';

// The workshop draws its stories in the app's two typefaces, served from its own files: nothing asks Google's font
// servers, which a browser or network may refuse, and both faces finish loading (claude-docs/workshop.md, ".storybook/").

const GOOGLE_FONTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

test('the brand fonts load from the workshop itself', async ({ page }) => {
  const googleRequests: string[] = [];
  page.on('request', (request) => {
    if (GOOGLE_FONTS.test(request.url())) googleRequests.push(request.url());
  });

  await page.goto('/iframe.html?id=foundations--default&viewMode=story&globals=theme:dark');
  await expect(page.getByRole('heading').first()).toBeVisible();

  // Each family the page's body text and headings name first, with the weight they ask for; a face is
  // fetched only once text uses it, so these are the faces the story needs.
  const families = await page.evaluate(async () => {
    await document.fonts.ready;
    const firstFamily = (element: Element) => {
      const style = getComputedStyle(element);
      return { family: style.fontFamily.split(',')[0].trim(), weight: style.fontWeight };
    };
    const used = [
      firstFamily(document.querySelector('.workshop-story-frame p') ?? document.body),
      firstFamily(document.querySelector('.workshop-story-frame h2, .workshop-story-frame h1')!),
    ];
    return used.map(({ family, weight }) => {
      const name = family.replace(/^["']|["']$/g, '');
      const faces = [...document.fonts].filter(
        (face) => face.family.replace(/^["']|["']$/g, '') === name,
      );
      return {
        name,
        // check() also answers true when no face has the name, so the loaded face is counted too.
        check: document.fonts.check(`${weight} 16px ${family}`),
        loaded: faces.filter((face) => face.status === 'loaded').length,
      };
    });
  });

  expect(googleRequests).toEqual([]);
  expect(families.map(({ name }) => name)).toEqual([
    expect.stringMatching(/^Lexend/),
    expect.stringMatching(/^Cormorant Unicase/),
  ]);
  for (const family of families) {
    expect(family, family.name).toMatchObject({ check: true });
    expect(family.loaded, family.name).toBeGreaterThan(0);
  }
});
