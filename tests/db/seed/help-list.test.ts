import { describe, expect, it } from 'vitest';
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
  'Do I Need an Account to Read the Compendium?',
  'Why Did Signing In Only Give Me the Demo Coven?',
  'How Do I Get My Own Coven?',
  'Who Can See My Spells?',
  "Why Can't a Complete Spell Go Back to Private or Draft?",
  'Can I Convert Grams to Millilitres?',
  "What's the Difference Between the Compendium and My Ingredients?",
  "Why Can't I Edit a Compendium Entry?",
  'How Do I Change My Email?',
  "I'm Locked Out of My Password",
  'How Do I Leave a Coven?',
  'How Do I Ask for Help or Report an Accessibility Bug?',
];

/** Each parent with its sub pages, every sub page at its parent's audience unless named. */
const SECTIONS: { title: string; audience: Audience; children: (string | Expected)[] }[] = [
  {
    title: 'Getting Started',
    audience: 'public',
    children: ['Signing In', 'The Demo Coven', 'Accepting an Invitation or a Printed Card'],
  },
  {
    title: 'The Compendium',
    audience: 'public',
    children: [
      'Searching and Filtering',
      'Reading an Entry and Its Sources',
      'The Toxic Flag and Safety Notes',
    ],
  },
  {
    title: 'Your Coven',
    audience: 'public',
    children: [
      'Steward, Practitioner and Observer',
      'Inviting Someone',
      'Removing Members and Leaving',
    ],
  },
  {
    title: 'Ingredients',
    audience: 'public',
    children: [
      'Adding From the Compendium or Making Your Own',
      'Variants and Forms',
      'Stock Levels',
      'Folk Names and Category Filters',
    ],
  },
  {
    title: 'Grimoire',
    audience: 'public',
    children: [
      'Building a Spell',
      'Steps and Units',
      'Intent Against Derived Categories',
      'Drafts, Private and Shared',
      'Duplicating a Spell',
      'Quick Look and Preview',
      'Moon Phase and Day Filters',
    ],
  },
  {
    title: 'Workings',
    audience: 'public',
    children: ['Recording a Working', 'Completing a Working and Taking Stock Out'],
  },
  {
    title: 'Account and Security',
    audience: 'public',
    children: ['Passwords and Lockout', 'Passkeys', 'Authenticator App', 'Changing Your Email'],
  },
  {
    title: 'Support',
    audience: 'public',
    children: ['Sending a Request and Reading Replies', 'What the Statuses Mean'],
  },
  {
    title: 'Curating a Compendium Entry',
    audience: 'staff',
    children: ['Sourcing With References', 'Formal Names, Common Names and Needs-Review'],
  },
  { title: 'Vocabularies and Categories', audience: 'staff', children: [] },
  {
    title: 'Working the Support Queue',
    audience: 'staff',
    children: [
      'What the Statuses Mean for Staff',
      {
        title: 'Timing a Sender Out and Turning a Request Into an Issue',
        audience: 'keeper',
        parent: 'Working the Support Queue',
      },
    ],
  },
  {
    title: "Keeper and Coven-Creation Grants, and the Primary Keeper's Pause",
    audience: 'keeper',
    children: [],
  },
  { title: 'Inviting a Curator or Keeper', audience: 'keeper', children: [] },
  { title: 'Minting Printed Cards', audience: 'keeper', children: [] },
  { title: 'Editing Site Documents', audience: 'keeper', children: [] },
  {
    title: 'Writing Help Articles',
    audience: 'keeper',
    children: [
      'The Help Article Form',
      'Audiences, Parents and Sub Pages',
      'Slugs and Addresses',
      'Who Reads What, and How Search Finds It',
    ],
  },
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

  it('names a parent only by the key of an article in the list, one level deep', () => {
    const children = articles.filter((article) => article.parent !== null);
    // Precondition: the list has sub pages, so the loop reads some.
    expect(children.length).toBeGreaterThan(0);
    for (const child of children) {
      const parent = byKey.get(child.parent as string);
      expect(parent, `${child.title}'s parent ${child.parent}`).toBeDefined();
      expect(child.kind, child.title).toBe('article');
      expect(parent?.kind, child.title).toBe('article');
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

  it('holds every article and sub page, under its parent and at its audience', () => {
    expect(ofKind('article').map(shaped).sort(byTitle)).toEqual(
      [...EXPECTED_ARTICLES].sort(byTitle),
    );
  });

  it('puts the support queue’s time-out page under the staff parent, for keepers only', () => {
    const page = ofKind('article').find(
      (article) =>
        plain(article.title) === 'Timing a Sender Out and Turning a Request Into an Issue',
    );
    expect(page).toBeDefined();
    expect(page?.audience).toBe('keeper');
    const parent = byKey.get(page?.parent ?? '');
    expect(parent).toMatchObject({ title: 'Working the Support Queue', audience: 'staff' });
  });

  it('holds at least one staff article and one keeper article', () => {
    const audiences = new Set(ofKind('article').map((article) => article.audience));
    expect(audiences.has('staff')).toBe(true);
    expect(audiences.has('keeper')).toBe(true);
  });

  it('holds every glossary term the record names', () => {
    const titles = new Set(ofKind('term').map((term) => plain(term.title)));
    expect(TERMS.filter((term) => !titles.has(term))).toEqual([]);
  });

  it('gives every entry a title and a body, and a body no widget tag', () => {
    for (const article of articles) {
      expect(article.title.trim(), article.seedKey).not.toBe('');
      expect(article.body.trim(), article.title).not.toBe('');
      // Widgets are a later task: the renderer does nothing with the tag yet, so a seeded one would print as text.
      expect(article.body, article.title).not.toMatch(/::widget\[/);
    }
  });
});
