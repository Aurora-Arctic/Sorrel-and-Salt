import type { Locator, Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { assertNoAccessibilityViolations } from './axe';
import { recreateE2eDatabase } from './database';

// Each document page's sections and sources as the reader meets them (claude-docs/design-decisions/support.md, "A keeper editor for the site's documents").

interface Section {
  heading: string;
  parts?: readonly string[];
}

interface DocumentShape {
  path: string;
  sections: readonly Section[];
  sources: readonly string[];
  cites: readonly number[];
}

const DOCUMENTS: readonly DocumentShape[] = [
  {
    path: '/privacy',
    sections: [
      { heading: 'The Short Version' },
      {
        heading: 'What Is Stored',
        parts: [
          'Your Account',
          'How You Sign In',
          'Your Sessions',
          'Rate-Limit Counters',
          'Who Wrote What',
          'What a Coven Holds',
          'Support Requests',
          'Time-Outs and Pauses',
          'Emails About Document Changes',
        ],
      },
      { heading: 'Who Sees It', parts: ['Who Can See What', 'Who Processes It'] },
      {
        heading: 'Keeping and Removing Your Data',
        parts: ['How Long It Is Kept', 'How to Ask for Removal'],
      },
      { heading: 'What the Site Does Not Do' },
      { heading: 'Changes to This Policy' },
    ],
    sources: [],
    cites: [],
  },
  {
    path: '/disclaimer',
    sections: [
      { heading: 'The Short Version' },
      {
        heading: 'What the Compendium Is',
        parts: ['Information, Not Advice', 'An Interpretation, Not an Authority', 'No Warranty'],
      },
      {
        heading: 'Safety',
        parts: ['Safety Notes Are Not Complete', 'A Familiar Ingredient Can Still Harm'],
      },
      { heading: 'Other Sites' },
      { heading: 'Questions' },
      { heading: 'Sources' },
    ],
    sources: ['Kaddu, Steven', 'Wikipedia. "Bergamot Orange."', 'McDaniel-Price, Amanda'],
    cites: [1, 1, 1],
  },
  {
    path: '/code-of-ethics',
    sections: [
      { heading: 'The Short Version' },
      {
        heading: 'For Everyone',
        parts: ['What Everyone Agrees To', 'What We Value', 'Accessibility'],
      },
      {
        heading: 'The Compendium',
        parts: [
          'Closed Practices and Where Lore Comes From',
          'Ethical and Sustainable Sourcing',
          'Why the Compendium Cites Its Sources',
        ],
      },
      {
        heading: 'Running the Site',
        parts: ['Curators', 'Keepers', 'Developers', 'The Owner and Everyone Who Runs the Site'],
      },
      { heading: 'Sources' },
    ],
    sources: [
      'U.S. Fish & Wildlife Service',
      'Wikipedia. "Witch Trials',
      'World Wide Web Consortium',
      'Wikipedia. "Smudging',
      'Wikipedia. "American Indian Religious Freedom',
      'Wikipedia. "Hoodoo',
      'Wikipedia. "Salvia apiana',
      'Wikipedia. "Bursera graveolens',
      'Wikipedia. "Bulnesia sarmientoi',
      'Wikipedia. "Santalum album',
      'Wikipedia. "CITES',
    ],
    cites: [2, 1, 1, 3, 1, 1, 2, 1, 1, 1, 1],
  },
  {
    path: '/terms',
    sections: [
      { heading: 'The Short Version' },
      {
        heading: 'Using the Site',
        parts: [
          'Who May Use the Site',
          'What Is Yours',
          'The Compendium',
          'How to Treat Each Other',
        ],
      },
      {
        heading: 'What the Site Owes You',
        parts: ['What the Site Promises, and What It Does Not', 'What the Site Is Not Liable For'],
      },
      { heading: 'Disputes', parts: ['Which Law Applies', 'Settling a Dispute'] },
      {
        heading: 'This Agreement',
        parts: ['Agreeing to These Terms', 'Updates to These Terms', 'Leaving'],
      },
      { heading: 'Sources' },
    ],
    sources: [
      'United States.',
      'United States.',
      'Washington State Legislature.',
      'Washington State Legislature.',
      'Washington State Legislature.',
      'Washington Courts.',
      'Washington Courts. "Court Directory',
      'Washington State Legislature.',
    ],
    cites: [1, 1, 1, 1, 1, 2, 1, 1],
  },
];

test.beforeAll(async () => {
  await recreateE2eDatabase();
});

async function targetOf(page: Page, link: Locator): Promise<Locator> {
  const href = await link.getAttribute('href');
  expect(href).toMatch(/^#./);
  const target = page.locator(`[id="${decodeURIComponent(href!.slice(1))}"]`);
  await expect(target).toHaveCount(1);
  return target;
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

for (const { path, sections, sources, cites } of DOCUMENTS) {
  test(`${path} keeps its sections in its On This Page menu, each linking to its heading`, async ({
    page,
  }) => {
    await page.goto(path);
    const nav = page.getByRole('navigation', { name: 'On This Page' });

    const entries = sections.flatMap(({ heading, parts }) => parts ?? [heading]);
    const links = nav.getByRole('link');
    await expect(links).toHaveText(entries);

    for (const { heading, parts } of sections) {
      if (!parts) continue;
      await expect(nav.getByRole('list', { name: heading }).getByRole('link')).toHaveText(parts);
      await expect(
        page.getByRole('heading', { level: 2, name: heading, exact: true }),
      ).toBeVisible();
    }
    for (const [index, entry] of entries.entries()) {
      const target = await targetOf(page, links.nth(index));
      await expect(target).toHaveRole('heading');
      await expect(target).toHaveAccessibleName(entry);
    }

    await assertNoAccessibilityViolations(page);
  });

  test(`${path} links every source mark to its source, and every source back to its marks`, async ({
    page,
  }) => {
    await page.goto(path);
    const marks = page.getByRole('link', { name: /^Source \d+$/ });
    await expect(marks).toHaveCount(cites.reduce((sum, count) => sum + count, 0));
    if (sources.length === 0) return;

    const first = await targetOf(
      page,
      page.getByRole('link', { name: 'Source 1', exact: true }).first(),
    );
    const list = first.locator('xpath=..');
    await expect(list.locator(':scope > li')).toHaveCount(sources.length);
    const sourcesHeading = page.getByRole('heading', { level: 2, name: 'Sources', exact: true });
    await expect(sourcesHeading).toBeVisible();

    for (const [index, opening] of sources.entries()) {
      const number = index + 1;
      const own = page.getByRole('link', { name: `Source ${number}`, exact: true });
      await expect(own, `marks of source ${number}`).toHaveCount(cites[index]!);

      const entry = await targetOf(page, own.first());
      await expect(entry).toHaveText(new RegExp(`^\\s*${escape(opening)}`));
      // Every mark of one source points at the same entry.
      const targets = new Set(
        await own.evaluateAll((links) => links.map((link) => link.getAttribute('href'))),
      );
      expect(targets.size).toBe(1);

      const back = entry.getByRole('link', { name: /^Back to (the text|citation \d+)$/ });
      await expect(back, `return links of source ${number}`).toHaveCount(cites[index]!);
      for (let link = 0; link < cites[index]!; link += 1) {
        const mark = await targetOf(page, back.nth(link));
        await expect(mark).toHaveAccessibleName(`Source ${number}`);
      }
      if (cites[index] === 1) {
        await expect(entry.getByRole('link', { name: 'Back to the text' })).toHaveCount(1);
      }
    }
  });
}
