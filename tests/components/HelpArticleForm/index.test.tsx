import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { Route } from 'next';
import type { ChangeEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  HelpArticleFormProps,
  HelpArticleFormValue,
  HelpGuideChoice,
  HelpSubPageChoice,
} from '@/components/HelpArticleForm/types';
import { makeQueryClient } from '@/lib/graphql-client';
import { mockGraphQLError, mockGraphQLMutation, mockGraphQLQuery } from '../../support/msw/graphql';
import { answer } from '../../support/discard-guard';
import { byLabel, choose, press, type } from '../../support/interact';
import { Navigating } from '../../support/navigating';

// The keeper's full-page form for a help row: the text beside a Details card holding the row's kind, shown, parent, sub
// pages, audience and position (claude-docs/components/help-article-form.md).

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  usePathname: () => '/keepers/help',
}));

// The body's editor has its own tests; here it is a text box that reports its Markdown, which is all the form reads.
vi.mock('@/components/RichTextEditor', () => ({
  useRichTextEditor: (markdown: string) => ({ markdown }),
  markdownOf: (editor: { markdown: string }) => editor.markdown,
  default: ({
    editor,
    label,
    onMarkdownChange,
    required,
    invalid,
    describedBy,
  }: {
    editor: { markdown: string };
    label: string;
    onMarkdownChange: (markdown: string) => void;
    required?: boolean;
    invalid?: boolean;
    describedBy?: string;
  }) => (
    <textarea
      aria-label={label}
      aria-required={required || undefined}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      defaultValue={editor.markdown}
      onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onMarkdownChange(event.target.value)}
    />
  ),
}));

// The form itself, not the lazy entry that loads it.
const { default: HelpArticleForm } = await import('@/components/HelpArticleForm/form');

type Input = Record<string, unknown>;
interface CreateVariables {
  input: Input;
}
interface UpdateVariables {
  id: string;
  input: Input;
}
interface ShownVariables {
  id: string;
  shown: boolean;
}

const RETURN = '/keepers/help' as Route;

const PUBLIC_GUIDE: HelpGuideChoice = {
  id: '6f1c2a3b-4d5e-4f60-8a71-9b0c1d2e3f40',
  title: 'Fixture Public Guide',
  slug: 'fixture-public-guide',
  audience: 'public',
  subPages: 2,
};
const STAFF_GUIDE: HelpGuideChoice = {
  id: '7a2d3b4c-5e6f-4a71-9b82-0c1d2e3f4a51',
  title: 'Fixture Staff Guide',
  slug: 'fixture-staff-guide',
  audience: 'staff',
  subPages: 2,
};
const KEEPER_GUIDE: HelpGuideChoice = {
  id: '8b3e4c5d-6f7a-4b82-8c93-1d2e3f4a5b62',
  title: 'Fixture Keeper Guide',
  slug: 'fixture-keeper-guide',
  audience: 'keeper',
  subPages: 0,
};
const GUIDES = [PUBLIC_GUIDE, STAFF_GUIDE, KEEPER_GUIDE];

const PUBLIC_SUB_A: HelpSubPageChoice = {
  id: '1a1a1a1a-0000-4000-8000-000000000001',
  title: 'Fixture Public Sub Page A',
  audience: 'public',
  parentId: PUBLIC_GUIDE.id,
  parentTitle: PUBLIC_GUIDE.title,
};
const PUBLIC_SUB_B: HelpSubPageChoice = {
  id: '1a1a1a1a-0000-4000-8000-000000000002',
  title: 'Fixture Public Sub Page B',
  audience: 'public',
  parentId: PUBLIC_GUIDE.id,
  parentTitle: PUBLIC_GUIDE.title,
};
const STAFF_SUB: HelpSubPageChoice = {
  id: '2b2b2b2b-0000-4000-8000-000000000001',
  title: 'Fixture Staff Sub Page',
  audience: 'staff',
  parentId: STAFF_GUIDE.id,
  parentTitle: STAFF_GUIDE.title,
};
const LONE_PUBLIC: HelpSubPageChoice = {
  id: '3c3c3c3c-0000-4000-8000-000000000001',
  title: 'Fixture Lone Public Page',
  audience: 'public',
  parentId: null,
  parentTitle: null,
};
const LONE_KEEPER: HelpSubPageChoice = {
  id: '3c3c3c3c-0000-4000-8000-000000000002',
  title: 'Fixture Lone Keeper Page',
  audience: 'keeper',
  parentId: null,
  parentTitle: null,
};
/** What the page hands over: every article holding no sub pages, the edited guide's own among them. */
const CANDIDATES = [PUBLIC_SUB_A, PUBLIC_SUB_B, STAFF_SUB, LONE_PUBLIC, LONE_KEEPER];

/** The public guide, holding its two sub pages. */
const GUIDE: HelpArticleFormValue = {
  id: PUBLIC_GUIDE.id,
  kind: 'article',
  title: PUBLIC_GUIDE.title,
  slug: PUBLIC_GUIDE.slug,
  summary: 'A guide the test holds',
  body: 'Fixture guide body.',
  audience: 'public',
  parentId: null,
  position: 1,
  shown: true,
  subPages: [PUBLIC_SUB_A, PUBLIC_SUB_B],
};

/** The staff guide's first sub page. */
const SUB_PAGE: HelpArticleFormValue = {
  id: STAFF_SUB.id,
  kind: 'article',
  title: STAFF_SUB.title,
  slug: 'fixture-staff-sub-page',
  summary: null,
  body: 'Fixture sub page body.',
  audience: 'staff',
  parentId: STAFF_GUIDE.id,
  position: 1,
  shown: true,
  subPages: [],
};

const TERM: HelpArticleFormValue = {
  id: 'ad5a6e7f-8b9c-4da4-8eb5-3f4a5b6c7d84',
  kind: 'term',
  title: 'Testwort',
  slug: 'testwort',
  summary: null,
  body: 'A word the test holds.',
  audience: 'public',
  parentId: null,
  position: null,
  shown: true,
  subPages: [],
};

const FAQ: HelpArticleFormValue = {
  ...TERM,
  id: 'be6b7f80-9cad-4eb5-9fc6-4a5b6c7d8e95',
  kind: 'faq',
  title: 'Does Testwort keep?',
  slug: 'does-testwort-keep',
  position: 2,
};

beforeEach(() => {
  router.push.mockClear();
});

function renderForm(props: Partial<HelpArticleFormProps> = {}): void {
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <Navigating push={router.push}>
        <HelpArticleForm guides={GUIDES} candidates={CANDIDATES} returnHref={RETURN} {...props} />
      </Navigating>
    </QueryClientProvider>,
  );
}

const button = (name: string) => screen.getByRole('button', { name });
const radio = (name: string) => screen.getByRole('radio', { name });
const shownSwitch = () => screen.getByRole('switch', { name: 'Shown' });
const textbox = (label: string) => byLabel(label, 'input, textarea');
const queryTextbox = (label: string) => screen.queryByLabelText(new RegExp(`^${label}\\b`));
const combobox = (label: string) => byLabel(label, '[role="combobox"]');
const queryCombobox = (label: string) =>
  screen.queryByRole('combobox', { name: new RegExp(`^${label}\\b`) });
const group = (name: string | RegExp) => screen.getByRole('group', { name });
const queryGroup = (name: string) => screen.queryByRole('group', { name });
const wentBack = () => router.push.mock.calls.some(([href]) => href === RETURN);
const left = () => expect(wentBack()).toBe(true);

function expectOffered(label: string, offered: readonly string[], absent: readonly string[] = []) {
  fireEvent.click(combobox(label));
  const list = screen.getByRole('listbox', { name: `${label} choices` });
  for (const name of offered) expect(within(list).getByRole('option', { name })).toBeVisible();
  for (const name of absent) expect(within(list).queryByRole('option', { name })).toBeNull();
  fireEvent.click(combobox(label));
}

/** The text of each option Sub Pages offers for a typed fragment. */
function subPageOffers(typed: string): string {
  type('Add Sub Page', typed);
  const offered = screen.queryAllByRole('option').map((option) => option.textContent ?? '');
  type('Add Sub Page', '');
  return offered.join('\n');
}

function pickSubPage(choice: HelpSubPageChoice): void {
  type('Add Sub Page', choice.title);
  fireEvent.click(screen.getByRole('option', { name: new RegExp(`^${choice.title}`) }));
}

function captureCreate(id = '9f9f9f9f-0000-4000-8000-000000000001'): CreateVariables[] {
  const calls: CreateVariables[] = [];
  mockGraphQLMutation('CreateHelpArticle', (variables: CreateVariables) => {
    calls.push(variables);
    return { createHelpArticle: { id, slug: 'fixture-new' } };
  });
  return calls;
}

function captureUpdate(): UpdateVariables[] {
  const calls: UpdateVariables[] = [];
  mockGraphQLMutation('UpdateHelpArticle', (variables: UpdateVariables) => {
    calls.push(variables);
    return { updateHelpArticle: { id: variables.id, slug: 'fixture' } };
  });
  return calls;
}

function captureShown(): ShownVariables[] {
  const calls: ShownVariables[] = [];
  mockGraphQLMutation('SetHelpArticleShown', (variables: ShownVariables) => {
    calls.push(variables);
    return { setHelpArticleShown: { id: variables.id } };
  });
  return calls;
}

function fillNew(title = 'Fixture New Page') {
  type('Title', title);
  type('Body', 'Fixture body.');
}

describe('HelpArticleForm, its kinds', () => {
  it('starts a new row as an Article, headed and saved as the kind chosen', () => {
    renderForm();

    expect(radio('Article')).toBeChecked();
    expect(screen.getByRole('heading', { level: 1, name: 'Add Article' })).toBeInTheDocument();
    expect(button('Save Article')).toBeInTheDocument();

    fireEvent.click(radio('FAQ'));

    expect(screen.getByRole('heading', { level: 1, name: 'Add FAQ Entry' })).toBeInTheDocument();
    expect(button('Save FAQ Entry')).toBeInTheDocument();
  });

  it('saves a term with no audience, parent, sub pages or position', async () => {
    const calls = captureCreate();
    renderForm();

    // Precondition: an article has all four.
    expect(group('Audience')).toBeInTheDocument();
    expect(combobox('Parent')).toBeInTheDocument();
    expect(group('Sub Pages')).toBeInTheDocument();
    expect(textbox('Position')).toBeInTheDocument();

    fireEvent.click(radio('Term'));
    expect(queryGroup('Audience')).toBeNull();
    expect(queryCombobox('Parent')).toBeNull();
    expect(queryGroup('Sub Pages')).toBeNull();
    expect(queryTextbox('Position')).toBeNull();

    fillNew('Testwort');
    press('Save Term');

    await waitFor(left);
    const input = calls[0]?.input ?? {};
    expect(input.kind).toBe('term');
    for (const field of ['audience', 'parentId', 'childIds', 'position', 'summary']) {
      expect(input).not.toHaveProperty(field);
    }
  });

  it('gives an FAQ entry an audience and a position, and no parent or sub pages', async () => {
    const calls = captureCreate();
    renderForm();

    fireEvent.click(radio('FAQ'));
    expect(queryCombobox('Parent')).toBeNull();
    expect(queryGroup('Sub Pages')).toBeNull();

    fillNew('Does Testwort keep?');
    fireEvent.click(radio('Staff'));
    type('Position', '4');
    press('Save FAQ Entry');

    await waitFor(left);
    expect(calls[0]?.input).toMatchObject({ kind: 'faq', audience: 'staff', position: 4 });
    expect(calls[0]?.input).not.toHaveProperty('parentId');
    expect(calls[0]?.input).not.toHaveProperty('childIds');
    expect(calls[0]?.input).not.toHaveProperty('summary');
  });

  it('draws Summary for an article alone, as it draws Parent', () => {
    renderForm();

    // Precondition: a new article has the field, so its absence below is the kind's.
    expect(textbox('Summary')).toBeInTheDocument();
    fireEvent.click(radio('FAQ'));
    expect(queryTextbox('Summary')).toBeNull();
    fireEvent.click(radio('Term'));
    expect(queryTextbox('Summary')).toBeNull();
    fireEvent.click(radio('Article'));
    expect(textbox('Summary')).toBeInTheDocument();
  });

  it.each([
    { article: FAQ, summary: false },
    { article: TERM, summary: false },
    { article: GUIDE, summary: true },
  ])('draws Summary on an opened $article.kind: $summary', ({ article, summary }) => {
    renderForm({ article });

    expect(queryTextbox('Summary') !== null).toBe(summary);
  });

  it('keeps an edited row its kind: the choice is held, and the update names none', async () => {
    const calls = captureUpdate();
    renderForm({ article: FAQ });

    // The held chip reads its kind and offers no choice: it draws no menu of radios.
    const kindChip = within(group('Kind'));
    expect(kindChip.getByRole('button', { name: /^Kind: ?FAQ$/ })).toBeDisabled();
    expect(kindChip.queryAllByRole('radio')).toHaveLength(0);

    type('Position', '5');
    press('Save FAQ Entry');

    await waitFor(left);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.id).toBe(FAQ.id);
    expect(calls[0]?.input).not.toHaveProperty('kind');
  });

  it.each([
    { article: TERM, noun: 'Term' },
    { article: FAQ, noun: 'FAQ Entry' },
    { article: GUIDE, noun: 'Article' },
  ])('names a $noun in its Save and Delete', ({ article, noun }) => {
    renderForm({ article });

    expect(button(`Save ${noun}`)).toBeInTheDocument();
    expect(button(`Delete ${noun}`)).toBeInTheDocument();
  });
});

describe('HelpArticleForm, opening a row', () => {
  it('fills every field from the row', () => {
    renderForm({ article: SUB_PAGE });

    expect(textbox('Title')).toHaveValue(SUB_PAGE.title);
    expect(textbox('Summary')).toHaveValue('');
    expect(textbox('Body')).toHaveValue(SUB_PAGE.body);
    expect(combobox('Parent')).toHaveTextContent(STAFF_GUIDE.title);
    expect(radio('Staff')).toBeChecked();
    expect(shownSwitch()).toBeChecked();
  });

  it('starts a row added under a guide in that guide, at its audience, last among its sub pages', async () => {
    const calls = captureCreate();
    renderForm({ presetParentId: STAFF_GUIDE.id });

    expect(combobox('Parent')).toHaveTextContent(STAFF_GUIDE.title);
    expect(radio('Staff')).toBeChecked();
    expect(screen.getByText(`3 of 3 in ${STAFF_GUIDE.title}`)).toBeInTheDocument();

    fillNew();
    press('Save Article');

    await waitFor(left);
    expect(calls[0]?.input).toMatchObject({
      parentId: STAFF_GUIDE.id,
      audience: 'staff',
      position: 3,
      childIds: [],
    });
  });
});

describe('HelpArticleForm, its parent', () => {
  it('offers No Parent and every guide, never the row itself', () => {
    renderForm({ article: { ...GUIDE, subPages: [] } });

    // Precondition: the row is among the guides the page handed over.
    expect(GUIDES.map(({ id }) => id)).toContain(GUIDE.id);
    expectOffered(
      'Parent',
      ['No Parent', STAFF_GUIDE.title, KEEPER_GUIDE.title],
      [PUBLIC_GUIDE.title],
    );
  });

  it('holds a guide with sub pages at No Parent', () => {
    renderForm({ article: GUIDE });

    expect(combobox('Parent')).toHaveTextContent('No Parent');
    expect(combobox('Parent')).toHaveAttribute('aria-disabled', 'true');
  });

  it('makes a chosen guide the parent, takes Sub Pages away, and places the row last in it', async () => {
    const calls = captureCreate();
    renderForm();

    fillNew();
    choose('Parent', PUBLIC_GUIDE.title);

    expect(queryGroup('Sub Pages')).toBeNull();
    expect(queryTextbox('Position')).toBeNull();
    expect(screen.getByText(`3 of 3 in ${PUBLIC_GUIDE.title}`)).toBeInTheDocument();

    press('Save Article');

    await waitFor(left);
    expect(calls[0]?.input).toMatchObject({
      parentId: PUBLIC_GUIDE.id,
      position: 3,
      childIds: [],
    });
  });

  it("narrows a wider audience to the guide's, and holds every wider one", () => {
    renderForm();

    // Precondition: a new row starts at Public, with every audience open.
    expect(radio('Public')).toBeChecked();
    expect(radio('Public')).toBeEnabled();

    choose('Parent', STAFF_GUIDE.title);

    expect(radio('Staff')).toBeChecked();
    expect(radio('Public')).toBeDisabled();
    expect(radio('Staff')).toBeEnabled();
    expect(radio('Keeper')).toBeEnabled();
  });

  it("keeps a narrower audience when the guide's is wider", () => {
    renderForm();

    fireEvent.click(radio('Keeper'));
    choose('Parent', PUBLIC_GUIDE.title);

    expect(radio('Keeper')).toBeChecked();
  });

  it('puts a sub page back where it was when its own guide is chosen again', () => {
    renderForm({ article: SUB_PAGE });

    choose('Parent', PUBLIC_GUIDE.title);
    expect(screen.getByText(`3 of 3 in ${PUBLIC_GUIDE.title}`)).toBeInTheDocument();

    choose('Parent', STAFF_GUIDE.title);
    expect(screen.getByText(`1 of 2 in ${STAFF_GUIDE.title}`)).toBeInTheDocument();
  });

  it('makes a sub page that leaves its guide the last guide', async () => {
    const calls = captureUpdate();
    renderForm({ article: SUB_PAGE });

    choose('Parent', 'No Parent');

    expect(textbox('Position')).toHaveValue(String(GUIDES.length + 1));
    expect(group('Sub Pages')).toBeInTheDocument();

    press('Save Article');

    await waitFor(left);
    expect(calls[0]?.input).toMatchObject({ parentId: null, position: GUIDES.length + 1 });
  });

  it('links a sub page to its guide for reordering, as its position is the guide’s to set', () => {
    renderForm({ article: SUB_PAGE });

    expect(screen.getByText(`1 of 2 in ${STAFF_GUIDE.title}`)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reorder in the Guide' })).toHaveAttribute(
      'href',
      expect.stringContaining(STAFF_GUIDE.id),
    );
  });
});

describe('HelpArticleForm, its sub pages', () => {
  it("draws a guide's sub pages as chips, and saves them in their order", async () => {
    const calls = captureUpdate();
    renderForm({ article: GUIDE });

    expect(button(`Remove Sub Page: ${PUBLIC_SUB_A.title}`)).toBeInTheDocument();
    expect(button(`Remove Sub Page: ${PUBLIC_SUB_B.title}`)).toBeInTheDocument();

    fireEvent.click(button(`Remove Sub Page: ${PUBLIC_SUB_A.title}`));
    press('Save Article');

    await waitFor(left);
    expect(calls[0]?.input).toMatchObject({ childIds: [PUBLIC_SUB_B.id] });
  });

  it('says a pick from another guide moves when the form is saved, and saves it last', async () => {
    const calls = captureUpdate();
    renderForm({ article: GUIDE });

    // Precondition: nothing is said to move yet.
    expect(screen.queryByText(/when you save\.$/)).toBeNull();

    pickSubPage(STAFF_SUB);

    expect(
      screen.getByText(
        `${STAFF_SUB.title} leaves ${STAFF_GUIDE.title} and becomes this guide’s third sub page when you save.`,
      ),
    ).toBeInTheDocument();

    press('Save Article');

    await waitFor(left);
    expect(calls[0]?.input).toMatchObject({
      childIds: [PUBLIC_SUB_A.id, PUBLIC_SUB_B.id, STAFF_SUB.id],
    });
  });

  it('offers only pages as narrow as the guide or narrower, never one already chosen', () => {
    renderForm({ article: GUIDE });

    // Precondition: a public guide is offered every page not already its own.
    const wide = subPageOffers('Fixture');
    expect(wide).toContain(STAFF_SUB.title);
    expect(wide).toContain(LONE_PUBLIC.title);
    expect(wide).toContain(LONE_KEEPER.title);
    expect(wide).not.toContain(PUBLIC_SUB_A.title);

    fireEvent.click(button(`Remove Sub Page: ${PUBLIC_SUB_A.title}`));
    fireEvent.click(button(`Remove Sub Page: ${PUBLIC_SUB_B.title}`));
    fireEvent.click(radio('Staff'));

    const narrow = subPageOffers('Fixture');
    expect(narrow).toContain(STAFF_SUB.title);
    expect(narrow).toContain(LONE_KEEPER.title);
    expect(narrow).not.toContain(LONE_PUBLIC.title);
  });

  it("holds every audience narrower than its widest sub page's", () => {
    renderForm();

    // Precondition: every audience is open to a row with no sub pages.
    for (const audience of ['Public', 'Staff', 'Keeper']) expect(radio(audience)).toBeEnabled();

    // A keeper sub page sits under a parent of any audience, as a child is as wide as its parent or narrower.
    pickSubPage(LONE_KEEPER);
    for (const audience of ['Public', 'Staff', 'Keeper']) expect(radio(audience)).toBeEnabled();

    pickSubPage(STAFF_SUB);

    expect(radio('Public')).toBeEnabled();
    expect(radio('Staff')).toBeEnabled();
    expect(radio('Keeper')).toBeDisabled();
  });

  it('holds Parent at No Parent once a sub page is chosen', () => {
    renderForm();

    // Precondition: a row with no sub pages may choose a parent.
    expect(combobox('Parent')).not.toHaveAttribute('aria-disabled', 'true');

    pickSubPage(LONE_PUBLIC);

    expect(combobox('Parent')).toHaveAttribute('aria-disabled', 'true');
  });
});

describe('HelpArticleForm, its position', () => {
  it('refuses a position that is not a whole number before asking the server', async () => {
    const calls = captureCreate();
    renderForm();

    fillNew();
    type('Position', '2.5');
    press('Save Article');

    await waitFor(() => expect(textbox('Position')).toHaveAttribute('aria-invalid', 'true'));
    expect(textbox('Position')).toHaveAccessibleDescription(/whole number/i);
    expect(calls).toHaveLength(0);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('sends 0 as a whole number', async () => {
    const calls = captureCreate();
    renderForm();

    fillNew();
    type('Position', '0');
    press('Save Article');

    await waitFor(left);
    expect(calls[0]?.input).toMatchObject({ position: 0 });
  });

  it('says where a guide stands among the guides', () => {
    renderForm({ article: GUIDE });

    expect(textbox('Position')).toHaveAccessibleDescription(
      expect.stringContaining(`1 of ${GUIDES.length} guides`),
    );
  });

  it('asks for the numeric keyboard', () => {
    renderForm();

    expect(textbox('Position')).toHaveAttribute('inputmode', 'numeric');
  });
});

describe('HelpArticleForm, Shown', () => {
  it('saves a new row shown without a second call', async () => {
    captureCreate();
    const shown = captureShown();
    renderForm();

    fillNew();
    press('Save Article');

    await waitFor(left);
    expect(shown).toHaveLength(0);
  });

  it('hides a new row switched off, once it exists', async () => {
    const id = '9f9f9f9f-0000-4000-8000-000000000002';
    const created = captureCreate(id);
    const shown = captureShown();
    renderForm();

    fillNew();
    fireEvent.click(shownSwitch());
    expect(shownSwitch()).not.toBeChecked();
    press('Save Article');

    await waitFor(left);
    expect(created).toHaveLength(1);
    expect(shown).toEqual([{ id, shown: false }]);
  });

  it('holds a press until Save, then sends it for the edited row', async () => {
    captureUpdate();
    const shown = captureShown();
    renderForm({ article: FAQ });

    fireEvent.click(shownSwitch());

    expect(shown).toHaveLength(0);
    expect(button('Save FAQ Entry')).toBeEnabled();

    press('Save FAQ Entry');

    await waitFor(left);
    expect(shown).toEqual([{ id: FAQ.id, shown: false }]);
  });

  it('sends no Shown for an edited row whose switch is unchanged', async () => {
    captureUpdate();
    const shown = captureShown();
    renderForm({ article: FAQ });

    type('Position', '5');
    press('Save FAQ Entry');

    await waitFor(left);
    expect(shown).toHaveLength(0);
  });
});

describe('HelpArticleForm, renaming', () => {
  const EFFECTS = {
    oldPath: '/help/fixture-public-guide',
    newPath: '/help/fixture-renamed-guide',
    articles: [{ id: LONE_PUBLIC.id, title: LONE_PUBLIC.title }],
    quickLinks: ['Fixture Quick Link'],
  };

  function effects(found = EFFECTS): { id: string; title: string }[] {
    const asked: { id: string; title: string }[] = [];
    mockGraphQLQuery('HelpRenameEffects', (variables: { id: string; title: string }) => {
      asked.push(variables);
      return { helpRenameEffects: found };
    });
    return asked;
  }

  it('asks before a new title breaks links, naming each, and saves only on Rename', async () => {
    const asked = effects();
    const calls = captureUpdate();
    renderForm({ article: GUIDE });

    type('Title', 'Fixture Renamed Guide');
    press('Save Article');

    expect(await screen.findByText(LONE_PUBLIC.title, { selector: 'li' })).toBeInTheDocument();
    expect(screen.getByText(/Fixture Quick Link/, { selector: 'li' })).toBeInTheDocument();
    expect(asked).toEqual([{ id: GUIDE.id, title: 'Fixture Renamed Guide' }]);
    // Precondition: asking is not saving.
    expect(calls).toHaveLength(0);

    press(answer('Rename'));

    await waitFor(left);
    expect(calls[0]?.input).toMatchObject({ title: 'Fixture Renamed Guide' });
  });

  it('keeps the form and saves nothing when the rename is called off', async () => {
    effects();
    const calls = captureUpdate();
    renderForm({ article: GUIDE });

    type('Title', 'Fixture Renamed Guide');
    press('Save Article');
    await screen.findByText(LONE_PUBLIC.title, { selector: 'li' });

    // On a page the form stays live behind the question, so its own Cancel is pressable too: the question's is the one meant.
    press(within(group(/^Renaming moves this page/)).getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText(LONE_PUBLIC.title, { selector: 'li' })).toBeNull();
    expect(textbox('Title')).toHaveValue('Fixture Renamed Guide');
    expect(calls).toHaveLength(0);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('saves at once when nothing holds the old address', async () => {
    effects({ ...EFFECTS, articles: [], quickLinks: [] });
    const calls = captureUpdate();
    renderForm({ article: GUIDE });

    type('Title', 'Fixture Renamed Guide');
    press('Save Article');

    await waitFor(left);
    expect(calls).toHaveLength(1);
  });

  it('never asks when the title keeps the address', async () => {
    const asked = effects();
    captureUpdate();
    renderForm({ article: GUIDE });

    type('Summary', 'A changed summary');
    press('Save Article');

    await waitFor(left);
    expect(asked).toHaveLength(0);
  });

  it('describes the title with the address it makes, under the chosen guide', () => {
    renderForm();

    type('Title', 'Fixture New Page');
    expect(textbox('Title')).toHaveAccessibleDescription(
      expect.stringContaining('/help/fixture-new-page'),
    );

    choose('Parent', PUBLIC_GUIDE.title);
    expect(textbox('Title')).toHaveAccessibleDescription(
      expect.stringContaining(`/help/${PUBLIC_GUIDE.slug}/fixture-new-page`),
    );
  });
});

describe("HelpArticleForm, the service's refusals", () => {
  it.each([
    {
      path: 'title',
      label: 'Title',
      message: 'Another article has a title that makes the same address',
    },
    { path: 'position', label: 'Position', message: 'Give the position as 0 or more' },
  ])(
    'lands a refusal at `$path` beside $label, not above the form',
    async ({ path, label, message }) => {
      mockGraphQLError('UpdateHelpArticle', {
        code: 'VALIDATION',
        fieldErrors: [{ path: [path], message }],
      });
      renderForm({ article: GUIDE });

      type('Summary', 'A changed summary');
      press('Save Article');

      await waitFor(() => expect(textbox(label)).toHaveAttribute('aria-invalid', 'true'));
      expect(textbox(label)).toHaveAccessibleDescription(expect.stringContaining(message));
      expect(screen.queryByRole('alert')).toBeNull();
      expect(router.push).not.toHaveBeenCalled();
    },
  );

  it('lands a refusal at `audience` on the Audience group', async () => {
    mockGraphQLError('UpdateHelpArticle', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['audience'], message: 'A guide cannot be wider than a sub page' }],
    });
    renderForm({ article: GUIDE });

    type('Summary', 'A changed summary');
    press('Save Article');

    await waitFor(() =>
      expect(group('Audience')).toHaveAccessibleDescription(/wider than a sub page/),
    );
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe('HelpArticleForm, saving and leaving', () => {
  it('keeps Save off on an edit until something changes, and off again once it is put back', () => {
    renderForm({ article: GUIDE });

    expect(button('Save Article')).toBeDisabled();
    type('Summary', 'A changed summary');
    expect(button('Save Article')).toBeEnabled();
    type('Summary', GUIDE.summary ?? '');
    expect(button('Save Article')).toBeDisabled();
  });

  it('refuses a blank title and body before asking the server', async () => {
    const calls = captureCreate();
    renderForm();

    type('Summary', 'Only a summary');
    press('Save Article');

    await waitFor(() => expect(textbox('Title')).toHaveAttribute('aria-invalid', 'true'));
    expect(textbox('Body')).toHaveAttribute('aria-invalid', 'true');
    expect(textbox('Body')).toHaveAccessibleDescription(/\S/);
    expect(calls).toHaveLength(0);
  });

  it('goes back to the outline on Cancel with nothing changed', async () => {
    renderForm({ article: FAQ });

    // The press starts a navigation that suspends, so it is awaited inside act.
    await act(async () => press('Cancel'));

    left();
  });

  it('asks before Cancel discards a change, and goes back on Discard Changes', async () => {
    renderForm({ article: FAQ });

    type('Position', '5');
    press('Cancel');

    expect(router.push).not.toHaveBeenCalled();
    press(answer('Keep Editing'));
    expect(textbox('Position')).toHaveValue('5');

    press('Cancel');
    await act(async () => press(answer('Discard Changes')));
    left();
  });

  it('goes back to the outline once saved, without asking', async () => {
    captureUpdate();
    renderForm({ article: FAQ });

    type('Position', '5');
    press('Save FAQ Entry');

    await waitFor(left);
    expect(screen.queryByRole('button', { name: 'Discard Changes' })).toBeNull();
  });
});

describe('HelpArticleForm, deleting', () => {
  it('has no Delete on a new row', () => {
    renderForm();

    expect(screen.queryByRole('button', { name: /^Delete/ })).toBeNull();
  });

  it('asks first, deletes on confirmation, then goes back', async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation('DeleteHelpArticle', (variables) => {
      calls.push(variables);
      return { deleteHelpArticle: FAQ.id };
    });
    renderForm({ article: FAQ });

    press('Delete FAQ Entry');
    // Precondition: asking is not deleting.
    expect(calls).toHaveLength(0);
    press(answer('Delete'));

    await waitFor(left);
    expect(calls).toEqual([{ id: FAQ.id }]);
  });

  it('shows the refusal of a guide with live sub pages, and stays', async () => {
    mockGraphQLError('DeleteHelpArticle', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['id'], message: 'Delete or move this article’s sub pages first' }],
      message: 'Delete or move this article’s sub pages first',
    });
    renderForm({ article: GUIDE });

    press('Delete Article');
    press(answer('Delete'));

    expect(await screen.findByRole('alert')).toHaveTextContent(/sub pages first/);
    expect(button('Delete Article')).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });
});
