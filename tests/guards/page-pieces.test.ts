import { describe, expect, it } from 'vitest';
import { filesMatching, readSource, sourceFiles } from '../support/repo-scan';

// Markup and words a page and its skeleton both draw, each written in one file so the loading state cannot differ from
// the page it stands in for. The words are matched only as code (a quoted string or JSX text), never in a comment, and
// the seeded help articles, stories and tests, which quote them, are not scanned.

const app = () =>
  sourceFiles({ under: 'src/' }).filter(
    (file) => !file.startsWith('src/db/') && !/\.stories\.tsx?$/.test(file),
  );

/** A file's code without its comments, so a doc citation such as `(modal.md, "Add Ingredient")` is not counted as writing the words. */
const code = (file: string) =>
  readSource(file)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

const writing = (files: string[], regex: RegExp) => files.filter((file) => regex.test(code(file)));

const written = (words: string) => new RegExp(`(['"\`])${words}\\1|>\\s*${words}\\s*<`);

describe('the action and spell section titles', () => {
  it.each([
    // The shell's button, the curator compendium's title, and the coven and admin skeletons.
    ['Add Ingredient', 'src/components/AppShell/add-ingredient-button.tsx'],
    // The grimoire skeleton's action and the builder's dialog title.
    ['New Spell', 'src/components/SpellBuilder/spell-dialog.tsx'],
    // The spell page's menu, its skeleton and each section's own heading.
    ['Category Match', 'src/components/SpellRecipe/sections.ts'],
    ['In the Cupboard', 'src/components/SpellRecipe/sections.ts'],
    ['Workings', 'src/components/SpellRecipe/sections.ts'],
  ])('“%s” is written in one file and imported as a constant', (words, writer) => {
    const files = app();
    // Precondition: a file that writes it today is in the scan.
    expect(files).toContain(writer);

    expect(writing(files, written(words))).toHaveLength(1);
  });
});

describe('the demo coven notice', () => {
  it('is chosen for a role only by the demo notice module', () => {
    const files = app();
    expect(files).toContain('src/lib/demo-notice.ts');
    expect(files).toContain('src/app/(shell)/coven/[slug]/layout.tsx');

    expect(filesMatching(files, /\bDEMO_OWNER_NOTICE\b/)).toEqual(['src/lib/demo-notice.ts']);
  });
});

describe('panel sections', () => {
  // The two narrow account skeletons are not forced in: their pages draw a bare panel whose form owns its heading.
  const ALLOWED = [
    'src/components/PanelSection/index.tsx',
    'src/components/NarrowPanelPage/index.tsx',
    'src/components/Skeleton/panel.tsx',
    'src/app/(shell)/account/email/skeleton.tsx',
    'src/app/(shell)/account/terms/skeleton.tsx',
  ];

  it('are drawn by PanelSection, the narrow panel page and the panel skeleton, never by a page', () => {
    const files = app();
    expect(files).toContain('src/app/(shell)/account/(tabs)/page.tsx');
    expect(files).toContain('src/app/(shell)/coven/new/page.tsx');

    expect(filesMatching(files, /page-frame__section panel/).sort()).toEqual([...ALLOWED].sort());
  });
});

describe('the help pages’ frames', () => {
  it.each([
    // The keepers' help article form pages and their skeleton.
    ['the article form’s back bar', /help-article-form__bar/],
    // The public help front and its skeleton.
    ['the help front’s wrapper', /["'\s]help-front["'\s]/],
    ['the help front’s body', /help-front__body/],
  ])('%s is written in one file', (_name, regex) => {
    const files = app().filter((file) => file.endsWith('.tsx'));
    expect(files).toContain('src/components/HelpFront/index.tsx');
    expect(files).toContain('src/components/HelpArticleForm/skeleton.tsx');

    expect(filesMatching(files, regex)).toHaveLength(1);
  });
});

describe('the public document skeletons', () => {
  it('are drawn by at most one shared piece, which every document route uses', () => {
    const files = app();
    // Precondition: the document routes' shared page file and one document page are in the scan.
    expect(files).toContain('src/app/(public)/_documents.tsx');
    expect(files).toContain('src/app/(public)/terms/page.tsx');

    expect(filesMatching(files, /<DocumentSkeleton\b/).length).toBeLessThanOrEqual(1);
  });
});
