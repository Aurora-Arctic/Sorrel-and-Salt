import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { helpTerms, marksInMarkdown } from '@/lib/help-marks';
import { HELP_WIDGETS, widgetsInMarkdown } from '@/lib/help-widgets';
import { slugify } from '@/lib/slugify';
import { loadHelpArticles } from '@/db/seed/help';
import type { SeedHelpArticle } from '@/db/seed/types';

// Which rows the shipped help list holds, read without a database: each FAQ, article, sub page and glossary term the help
// record names (claude-docs/tasks/m17.md, M17.17), with its audience and its parent. What the prose says is reviewed, not tested;
// a body is only required to be there. Running the seed is help.test.ts's.

type Audience = SeedHelpArticle['audience'];

interface Expected {
  title: string;
  audience: Audience;
  parent: string | null;
}

const FAQ: string[] = [
  'Do I need an account to read the Compendium?',
  'Why did signing in only give me the Demo Coven?',
  'How do I get my own coven?',
  'Why was I sent to the terms page?',
  "What's the difference between the Compendium and my Ingredients?",
  "Why can't I edit a Compendium entry?",
  'Who can see my spells?',
  "Why can't a complete spell go back to private or draft?",
  'Does my spell save automatically?',
  'Can I undo a change in a form?',
  'Why does my spell say a step is short?',
  'Can I convert grams to millilitres?',
  'How do I change my email?',
  "I'm locked out of my password",
  'Why is my access paused?',
  'How do I leave a coven?',
  'How do I ask for help or report an accessibility bug?',
];

/** The one article each widget lives in; every other page that needs it points there. */
const WIDGET_HOMES: Record<string, string> = {
  'role-permission-table': 'Steward, Practitioner and Observer',
  'autosave-status': 'Your Spell Saves Itself',
  'invitation-refusals': 'My Invitation Link Does Not Work',
  'unit-converter': 'I Cannot Convert a Unit',
};

/** The article each committed screenshot belongs to. */
const SCREENSHOT_HOMES: Record<string, string> = {
  'Read an Entry and Its Sources': 'compendium-entry.png',
  'Build a Spell': 'spell-builder.png',
};

/** Each parent with its sub pages, every sub page at its parent's audience unless named. */
const SECTIONS: { title: string; audience: Audience; children: (string | Expected)[] }[] = [
  {
    title: 'Getting Started',
    audience: 'public',
    children: [
      'Signing In',
      'The Demo Coven',
      'Accept an Invitation',
      'Redeem a Printed Card',
      'Search the Help Centre',
    ],
  },
  {
    title: 'The Compendium',
    audience: 'public',
    children: [
      'Search and Filter the Compendium',
      'Read an Entry and Its Sources',
      'The Toxic Flag and Safety Notes',
    ],
  },
  {
    title: 'Your Coven',
    audience: 'public',
    children: [
      'Steward, Practitioner and Observer',
      'Create a Coven',
      'Invite Someone',
      "Pause and Lift a Member's Access",
      'Remove a Member or Leave',
      'Delete a Coven',
    ],
  },
  {
    title: 'Ingredients',
    audience: 'public',
    children: [
      'Add an Ingredient',
      'Variants and Forms',
      'Track Stock',
      'Find Ingredients',
      'Annotate an Entry or Make It Ours',
    ],
  },
  {
    title: 'Grimoire',
    audience: 'public',
    children: [
      'Build a Spell',
      'Steps and Units',
      'Intent Against Derived Categories',
      'Drafts, Private and Shared',
      'Duplicate a Spell',
      'Find and Preview Spells',
      'Your Spell Saves Itself',
    ],
  },
  {
    title: 'Workings',
    audience: 'public',
    children: ['Record a Working', 'Complete a Working and Take Stock Out'],
  },
  {
    title: 'Account and Security',
    audience: 'public',
    children: [
      'Passwords and Lockout',
      'Sign-In Methods',
      'Turn On Two-Factor Sign-In',
      'Change Your Email',
    ],
  },
  {
    title: 'Support',
    audience: 'public',
    children: [
      'Send a Support Request',
      'Read and Answer a Reply',
      'Read a Reply Without Signing In',
      'What the Statuses Mean',
    ],
  },
  {
    title: 'Troubleshooting',
    audience: 'public',
    children: [
      'I Cannot Sign In',
      'My Invitation Link Does Not Work',
      'I Cannot Complete a Working',
      'I Cannot Convert a Unit',
      'I Cannot Remove or Leave',
    ],
  },
  {
    title: 'Curating a Compendium Entry',
    audience: 'staff',
    children: ['Source an Entry With References', 'Formal Names, Common Names and Needs-Review'],
  },
  { title: 'Vocabularies and Categories', audience: 'staff', children: [] },
  {
    title: 'Working the Support Queue',
    audience: 'staff',
    children: [
      'What the Statuses Mean for Staff',
      {
        title: 'Time a Sender Out and Link a Request to an Issue',
        audience: 'keeper',
        parent: 'Working the Support Queue',
      },
    ],
  },
  { title: 'Granting Coven Creation or the Keeper Role', audience: 'keeper', children: [] },
  { title: 'Pausing Keeper Changes', audience: 'keeper', children: [] },
  { title: 'Inviting a Curator or Keeper', audience: 'keeper', children: [] },
  { title: 'Minting Printed Cards', audience: 'keeper', children: ['Read Card Sign-Ups'] },
  { title: 'Make Your Business Cards', audience: 'keeper', children: [] },
  {
    title: 'Editing Site Documents',
    audience: 'keeper',
    children: ['Mail a New Version to Every Account'],
  },
  {
    title: 'Writing Help Articles',
    audience: 'keeper',
    children: [
      'The Help Article Form',
      'Audiences, Parents and Sub Pages',
      'Slugs and Addresses',
      'Who Reads What',
    ],
  },
  { title: "Pause a User's Access", audience: 'keeper', children: [] },
  { title: 'Read the Privilege Ledger', audience: 'keeper', children: [] },
];

const TERMS: string[] = [
  'Compendium',
  'Ingredients',
  'Grimoire',
  'Coven',
  'Steward',
  'Practitioner',
  'Observer',
  'Keeper',
  'Curator',
  'Spell',
  'Working',
  'Variant',
  'Form',
  'Draft',
  'Complete',
  'Formal Name',
  'Common Name',
  'Reference',
  'Category',
  'Stock',
  'Demo Coven',
  'Invitation',
  'Support Request',
  'Pause',
  'Autosave',
];

const EXPECTED_ARTICLES: Expected[] = SECTIONS.flatMap(({ title, audience, children }) => [
  { title, audience, parent: null },
  ...children.map((child) =>
    typeof child === 'string' ? { title: child, audience, parent: title } : child,
  ),
]);

const RANK: Record<Audience, number> = { public: 0, staff: 1, keeper: 2 };

/** A typographic apostrophe and a straight one name the same title. */
const plain = (title: string) => title.replace(/[‘’]/g, "'");

const byTitle = (a: Expected, b: Expected) => (a.title < b.title ? -1 : a.title > b.title ? 1 : 0);

describe('the shipped help list', () => {
  const articles = loadHelpArticles();
  const byKey = new Map(articles.map((article) => [article.seedKey, article]));
  const ofKind = (kind: SeedHelpArticle['kind']) =>
    articles.filter((article) => article.kind === kind);
  const shaped = (article: SeedHelpArticle): Expected => ({
    title: plain(article.title),
    audience: article.audience,
    parent: article.parent === null ? null : plain(byKey.get(article.parent)?.title ?? '?'),
  });

  it('gives every entry a seed_key of its own', () => {
    const keys = articles.map((article) => article.seedKey);
    // Precondition: there is a list, so distinct keys are not an empty set.
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) expect(key.trim(), 'a blank seed_key').not.toBe('');
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('names a parent only by the key of a guide in the list, one level deep', () => {
    const children = articles.filter((article) => article.parent !== null);
    // Precondition: the list has sub pages, so the loop reads some.
    expect(children.length).toBeGreaterThan(0);
    for (const child of children) {
      const parent = byKey.get(child.parent as string);
      expect(parent, `${child.title}'s parent ${child.parent}`).toBeDefined();
      expect(child.kind, child.title).toBe('article');
      expect(parent?.kind, child.title).toBe('guide');
      expect(parent?.parent, `${child.title}'s parent has a parent`).toBeNull();
    }
  });

  it('gives each sub page its parent’s audience or a narrower one', () => {
    for (const child of articles.filter((article) => article.parent !== null)) {
      const parent = byKey.get(child.parent as string) as SeedHelpArticle;
      expect(RANK[child.audience], child.title).toBeGreaterThanOrEqual(RANK[parent.audience]);
    }
  });

  it('gives no term a position or a parent, and every term the public audience', () => {
    const terms = ofKind('term');
    expect(terms.length).toBeGreaterThan(0);
    for (const term of terms) {
      expect(term, term.title).toMatchObject({ position: null, parent: null, audience: 'public' });
    }
  });

  it('holds every FAQ question, public and each with a position of its own', () => {
    const faqs = ofKind('faq');
    expect(faqs.map(shaped).sort(byTitle)).toEqual(
      FAQ.map((title): Expected => ({ title, audience: 'public', parent: null })).sort(byTitle),
    );
    const positions = faqs.map((faq) => faq.position);
    for (const [index, position] of positions.entries()) {
      expect(Number.isInteger(position), faqs[index].title).toBe(true);
    }
    expect(new Set(positions).size).toBe(positions.length);
  });

  it('holds every guide, article and sub page, under its parent and at its audience', () => {
    expect([...ofKind('guide'), ...ofKind('article')].map(shaped).sort(byTitle)).toEqual(
      [...EXPECTED_ARTICLES].sort(byTitle),
    );
  });

  it('puts the support queue’s time-out page under the staff parent, for keepers only', () => {
    const page = ofKind('article').find(
      (article) => plain(article.title) === 'Time a Sender Out and Link a Request to an Issue',
    );
    expect(page).toBeDefined();
    expect(page?.audience).toBe('keeper');
    const parent = byKey.get(page?.parent ?? '');
    expect(parent).toMatchObject({ title: 'Working the Support Queue', audience: 'staff' });
  });

  it('holds at least one staff article and one keeper article', () => {
    const audiences = new Set(
      [...ofKind('guide'), ...ofKind('article')].map((article) => article.audience),
    );
    expect(audiences.has('staff')).toBe(true);
    expect(audiences.has('keeper')).toBe(true);
  });

  it('holds every glossary term the record names', () => {
    const titles = new Set(ofKind('term').map((term) => plain(term.title)));
    expect(TERMS.filter((term) => !titles.has(term))).toEqual([]);
  });

  it('gives every entry a title and a body', () => {
    for (const article of articles) {
      expect(article.title.trim(), article.seedKey).not.toBe('');
      expect(article.body.trim(), article.title).not.toBe('');
    }
  });

  it('places each widget once, in the article that is its home, and no unknown widget', () => {
    const placed = articles.flatMap((article) =>
      widgetsInMarkdown(article.body).map((name) => [name, plain(article.title)] as const),
    );

    expect(Object.fromEntries(placed)).toEqual(WIDGET_HOMES);
    expect(placed).toHaveLength(HELP_WIDGETS.length);
  });

  it('shows each screenshot in its article, as an image the site serves with alt text and a caption', () => {
    for (const [title, file] of Object.entries(SCREENSHOT_HOMES)) {
      const article = articles.find((row) => plain(row.title) === title);
      const image = /^!\[([^\]]+)\]\((\/help\/screens\/[^\s)]+) "([^"]+)"\)$/m.exec(
        article?.body ?? '',
      );

      expect(image?.[2], title).toBe(`/help/screens/${file}`);
      expect(existsSync(join('public', 'help', 'screens', file)), file).toBe(true);
    }
  });

  it('pairs every committed screenshot with a dark one of the same size', () => {
    const screens = join('public', 'help', 'screens');
    // A PNG's width and height are the two big-endian words after its signature and IHDR header.
    const size = (file: string) => {
      const bytes = readFileSync(join(screens, file));
      return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
    };
    const files = readdirSync(screens);
    const light = files.filter((file) => !file.endsWith('.dark.png'));

    expect(light.length).toBeGreaterThan(0);
    expect(files.filter((file) => !file.endsWith('.png'))).toEqual([]);
    expect([...files].sort()).toEqual(
      light.flatMap((file) => [file, file.replace(/\.png$/, '.dark.png')]).sort(),
    );
    for (const file of light) {
      expect(size(file.replace(/\.png$/, '.dark.png')), file).toEqual(size(file));
    }
  });

  it('names every widget in the keepers’ Writing Help Articles', () => {
    const guide = articles.find((row) => plain(row.title) === 'Writing Help Articles');

    expect(HELP_WIDGETS.filter((name) => !guide?.body.includes(`::widget[${name}]`))).toEqual([]);
  });

  it('marks only glossary terms the seed holds, and marks some', () => {
    const terms = helpTerms(
      ofKind('term').map((term) => ({
        slug: slugify(term.title),
        title: term.title,
        body: term.body,
      })),
    );
    let marked = 0;
    for (const article of articles) {
      const names = marksInMarkdown(article.body);
      marked += names.length;
      expect(
        names.filter((name) => !terms.find(name)),
        article.title,
      ).toEqual([]);
    }
    expect(marked).toBeGreaterThan(0);
  });
});
