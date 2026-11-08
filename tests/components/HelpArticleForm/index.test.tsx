import { QueryClientProvider } from '@tanstack/react-query';
import { HttpResponse } from 'msw/http';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HelpArticleForm from '@/components/HelpArticleForm';
import type {
  HelpArticleFormProps,
  HelpArticleFormValue,
  HelpParentChoice,
} from '@/components/HelpArticleForm/types';
import { makeQueryClient } from '@/lib/graphql-client';
import { graphqlLink, mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';
import { byLabel, choose, press, type } from '../../support/interact';
import {
  answer,
  expectAnswered,
  expectAskingOver,
  expectGuardedWaysOut,
  renderInModal,
} from '../../support/discard-guard';

// The keeper's form for a help row: an FAQ entry, an article or a glossary term (claude-docs/design-decisions/support.md,
// "Audiences, staff routes and search"; claude-docs/design/graphql.md, "Help articles").

type Input = Record<string, unknown>;
interface CreateVariables {
  input: Input;
}
interface UpdateVariables {
  id: string;
  input: Input;
}

const PUBLIC_PARENT: HelpParentChoice = {
  id: '6f1c2a3b-4d5e-4f60-8a71-9b0c1d2e3f40',
  title: 'Fixture Public Guide',
  slug: 'fixture-public-guide',
  audience: 'public',
};
const STAFF_PARENT: HelpParentChoice = {
  id: '7a2d3b4c-5e6f-4a71-9b82-0c1d2e3f4a51',
  title: 'Fixture Staff Guide',
  slug: 'fixture-staff-guide',
  audience: 'staff',
};
const KEEPER_PARENT: HelpParentChoice = {
  id: '8b3e4c5d-6f7a-4b82-8c93-1d2e3f4a5b62',
  title: 'Fixture Keeper Guide',
  slug: 'fixture-keeper-guide',
  audience: 'keeper',
};
const PARENTS = [PUBLIC_PARENT, STAFF_PARENT, KEEPER_PARENT];

const ARTICLE: HelpArticleFormValue = {
  id: PUBLIC_PARENT.id,
  kind: 'article',
  title: PUBLIC_PARENT.title,
  slug: 'fixture-public-guide',
  summary: 'A guide the test holds',
  body: 'Fixture guide body.',
  audience: 'public',
  parentId: null,
  position: 1,
};

const CHILD: HelpArticleFormValue = {
  id: '9c4f5d6e-7a8b-4c93-9da4-2e3f4a5b6c73',
  kind: 'article',
  title: 'Fixture Staff Sub Page',
  slug: 'fixture-staff-sub-page',
  summary: null,
  body: 'Fixture sub page body.',
  audience: 'keeper',
  parentId: STAFF_PARENT.id,
  position: 2,
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
};

const CREATED = {
  createHelpArticle: { ...ARTICLE, children: [] },
};

function renderForm(props: Partial<HelpArticleFormProps> = {}) {
  const onDone = vi.fn();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <HelpArticleForm parents={PARENTS} onDone={onDone} {...props} />
    </QueryClientProvider>,
  );
  return onDone;
}

const button = (name: string) => screen.getByRole('button', { name });
const combobox = (label: string) => byLabel(label, '[role="combobox"]');
const queryCombobox = (label: string) =>
  screen.queryByRole('combobox', { name: new RegExp(`^${label}\\b`) });
const textbox = (label: string) => byLabel(label, 'input, textarea');
const queryTextbox = (label: string) => screen.queryByLabelText(new RegExp(`^${label}\\b`));

/** The choices a picker offers, read by opening its list and closing it again. */
function optionsOf(label: string): HTMLElement[] {
  fireEvent.click(combobox(label));
  const options = within(screen.getByRole('listbox', { name: `${label} choices` })).getAllByRole(
    'option',
  );
  fireEvent.click(combobox(label));
  return options;
}

function expectOffered(label: string, offered: readonly string[], absent: readonly string[] = []) {
  fireEvent.click(combobox(label));
  const list = screen.getByRole('listbox', { name: `${label} choices` });
  for (const name of offered) expect(within(list).getByRole('option', { name })).toBeVisible();
  for (const name of absent) expect(within(list).queryByRole('option', { name })).toBeNull();
  fireEvent.click(combobox(label));
}

function captureCreate(): CreateVariables[] {
  const calls: CreateVariables[] = [];
  mockGraphQLMutation('CreateHelpArticle', (variables: CreateVariables) => {
    calls.push(variables);
    return CREATED;
  });
  return calls;
}

function captureUpdate(): UpdateVariables[] {
  const calls: UpdateVariables[] = [];
  mockGraphQLMutation('UpdateHelpArticle', (variables: UpdateVariables) => {
    calls.push(variables);
    return { updateHelpArticle: { ...ARTICLE, children: [] } };
  });
  return calls;
}

function fillArticle(title = 'Fixture New Guide') {
  type('Title', title);
  type('Body', 'Fixture body.');
}

describe('HelpArticleForm, its kinds', () => {
  it('offers FAQ, Article and Term, and starts a new row as an Article', () => {
    renderForm();

    const kinds = optionsOf('Kind');
    expect(kinds).toHaveLength(3);
    expectOffered('Kind', ['FAQ', 'Article', 'Term']);
    expect(button('Save Article')).toBeInTheDocument();
  });

  it('has no audience, parent or position for a term, and saves it public with none', async () => {
    const calls = captureCreate();
    const onDone = renderForm();

    // Precondition: an article shows all three.
    expect(combobox('Audience')).toBeInTheDocument();
    expect(combobox('Parent')).toBeInTheDocument();
    expect(textbox('Position')).toBeInTheDocument();

    choose('Kind', 'Term');
    expect(queryCombobox('Audience')).toBeNull();
    expect(queryCombobox('Parent')).toBeNull();
    expect(queryTextbox('Position')).toBeNull();

    type('Title', 'Testwort');
    type('Body', 'A word the test holds.');
    press('Save Term');

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    const { input } = calls[0] ?? { input: {} };
    expect(input.kind).toBe('term');
    expect(input.audience ?? 'public').toBe('public');
    expect(input.parentId ?? null).toBeNull();
    expect(input.position ?? null).toBeNull();
  });

  it('has an audience and a position for an FAQ entry, and no parent', () => {
    renderForm();

    choose('Kind', 'FAQ');

    expect(combobox('Audience')).toBeInTheDocument();
    expect(textbox('Position')).toBeInTheDocument();
    expect(queryCombobox('Parent')).toBeNull();
    expect(button('Save FAQ Entry')).toBeInTheDocument();
  });

  it('keeps an edited row its kind: the update names no kind', async () => {
    const calls = captureUpdate();
    const onDone = renderForm({ article: ARTICLE });

    type('Summary', 'A changed summary');
    press('Save Article');

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(calls).toHaveLength(1);
    expect(calls[0]?.id).toBe(ARTICLE.id);
    expect(calls[0]?.input).not.toHaveProperty('kind');
  });

  it('opens a term with no audience, parent or position', () => {
    renderForm({ article: TERM });

    expect(textbox('Title')).toHaveValue(TERM.title);
    expect(queryCombobox('Audience')).toBeNull();
    expect(queryCombobox('Parent')).toBeNull();
    expect(queryTextbox('Position')).toBeNull();
  });
});

describe('HelpArticleForm, its parent picker', () => {
  it('offers the parents it is given', () => {
    renderForm();

    expectOffered(
      'Parent',
      PARENTS.map(({ title }) => title),
    );
  });

  it('never offers an article as its own parent', () => {
    renderForm({ article: ARTICLE });

    // Precondition: the article is among the parents the page handed over.
    expect(PARENTS.map(({ id }) => id)).toContain(ARTICLE.id);
    expectOffered('Parent', [STAFF_PARENT.title, KEEPER_PARENT.title], [ARTICLE.title]);
  });

  it('saves the parent and position it is given', async () => {
    const calls = captureCreate();
    const onDone = renderForm();

    fillArticle();
    choose('Parent', PUBLIC_PARENT.title);
    type('Position', '3');
    press('Save Article');

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(calls[0]?.input).toMatchObject({
      kind: 'article',
      parentId: PUBLIC_PARENT.id,
      position: 3,
    });
  });
});

describe('HelpArticleForm, its audience picker', () => {
  it('offers Public, Staff and Keeper to a row with no parent, and starts at Public', async () => {
    const calls = captureCreate();
    const onDone = renderForm();

    expect(optionsOf('Audience')).toHaveLength(3);
    expectOffered('Audience', ['Public', 'Staff', 'Keeper']);

    fillArticle();
    press('Save Article');
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(calls[0]?.input.audience ?? 'public').toBe('public');
  });

  it.each([
    { parent: PUBLIC_PARENT, offered: ['Public', 'Staff', 'Keeper'], absent: [] },
    { parent: STAFF_PARENT, offered: ['Staff', 'Keeper'], absent: ['Public'] },
    { parent: KEEPER_PARENT, offered: ['Keeper'], absent: ['Public', 'Staff'] },
  ])(
    "offers a child of a $parent.audience parent only the parent's audience and narrower",
    ({ parent, offered, absent }) => {
      renderForm();

      choose('Parent', parent.title);

      expect(optionsOf('Audience')).toHaveLength(offered.length);
      expectOffered('Audience', offered, absent);
    },
  );

  it("narrows a wider audience to the parent's when the parent is chosen, and saves it so", async () => {
    const calls = captureCreate();
    const onDone = renderForm();

    fillArticle();
    // Precondition: the row was public before the parent was chosen.
    choose('Audience', 'Public');
    choose('Parent', STAFF_PARENT.title);
    press('Save Article');

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(calls[0]?.input).toMatchObject({ parentId: STAFF_PARENT.id, audience: 'staff' });
  });

  it("keeps a narrower audience when the parent's is wider", async () => {
    const calls = captureCreate();
    const onDone = renderForm();

    fillArticle();
    choose('Audience', 'Keeper');
    choose('Parent', PUBLIC_PARENT.title);
    press('Save Article');

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(calls[0]?.input).toMatchObject({ parentId: PUBLIC_PARENT.id, audience: 'keeper' });
  });

  it("opens an existing child offering only its parent's audience and narrower", () => {
    renderForm({ article: CHILD });

    expect(optionsOf('Audience')).toHaveLength(2);
    expectOffered('Audience', ['Staff', 'Keeper'], ['Public']);
  });

  // A child is made top-level again by No Parent, which the update sends as a null parent.
  it('offers every audience again once No Parent is chosen, and clears the parent', async () => {
    const calls = captureUpdate();
    const onDone = renderForm({ article: CHILD });

    // Precondition: the child's parent narrows the list.
    expect(optionsOf('Audience')).toHaveLength(2);
    choose('Parent', 'No Parent');

    expect(optionsOf('Audience')).toHaveLength(3);
    press('Save Article');
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(calls[0]?.input).toHaveProperty('parentId', null);
  });
});

// Each rule the service holds is pathed to its field (claude-docs/design/graphql.md, "Help articles"), and lands beside it.
describe("HelpArticleForm, the service's refusals", () => {
  it.each([
    {
      path: 'title',
      label: 'Title',
      message: 'Another article has a title that makes the same address',
      box: textbox,
    },
    {
      path: 'parentId',
      label: 'Parent',
      message: 'A child cannot be a parent: help nests one level',
      box: combobox,
    },
    {
      path: 'position',
      label: 'Position',
      message: 'Give the position as 0 or more',
      box: textbox,
    },
    {
      path: 'audience',
      label: 'Audience',
      message: 'A parent cannot be narrower than a child it holds',
      box: combobox,
    },
  ])(
    'lands a refusal at `$path` beside $label, not above the form',
    async ({ path, label, message, box }) => {
      mockGraphQLError('UpdateHelpArticle', {
        code: 'VALIDATION',
        fieldErrors: [{ path: [path], message }],
      });
      const onDone = renderForm({ article: ARTICLE });

      type('Summary', 'A changed summary');
      press('Save Article');

      await waitFor(() => expect(box(label)).toHaveAttribute('aria-invalid', 'true'));
      expect(box(label)).toHaveAccessibleDescription(/\S/);
      expect(screen.queryByRole('alert')).toBeNull();
      expect(onDone).not.toHaveBeenCalled();
    },
  );

  it("lands a new row's reserved-address refusal beside Title", async () => {
    mockGraphQLError('CreateHelpArticle', {
      code: 'VALIDATION',
      fieldErrors: [
        {
          path: ['title'],
          message: 'That title makes the address “glossary”, which is a page of its own',
        },
      ],
    });
    const onDone = renderForm();

    fillArticle();
    type('Title', 'Glossary');
    press('Save Article');

    await waitFor(() => expect(textbox('Title')).toHaveAttribute('aria-invalid', 'true'));
    expect(textbox('Title')).toHaveAccessibleDescription(/\S/);
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe('HelpArticleForm, its address', () => {
  it('has no slug field, and sends no slug on create or on edit', async () => {
    const created = captureCreate();
    const onDone = renderForm();

    expect(queryTextbox('Slug')).toBeNull();
    fillArticle();
    press('Save Article');
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(created[0]?.input).not.toHaveProperty('slug');
  });

  it('sends a renamed row its new title and no slug', async () => {
    const calls = captureUpdate();
    const onDone = renderForm({ article: ARTICLE });

    type('Title', 'Fixture Renamed Guide');
    press('Save Article');

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(calls[0]?.input.title).toBe('Fixture Renamed Guide');
    expect(calls[0]?.input).not.toHaveProperty('slug');
  });

  it('describes the title with the address it makes, as the title is typed, beneath the chosen parent', () => {
    renderForm();

    type('Title', 'Accept an Invitation');
    expect(textbox('Title')).toHaveAccessibleDescription(/\/help\/accept-an-invitation\b/);

    choose('Parent', STAFF_PARENT.title);
    expect(textbox('Title')).toHaveAccessibleDescription(
      /\/help\/staff\/fixture-staff-guide\/accept-an-invitation\b/,
    );
  });

  it('describes no address for a title that makes none', () => {
    renderForm();

    type('Title', '!!!');
    expect(textbox('Title')).not.toHaveAccessibleDescription(/\/help/);
  });
});

describe('HelpArticleForm, its position', () => {
  it.each(['-1', '1.5', 'two'])('refuses %s before asking the server', async (typed) => {
    const calls = captureCreate();
    const onDone = renderForm();

    fillArticle();
    type('Position', typed);
    press('Save Article');

    await waitFor(() => expect(textbox('Position')).toHaveAttribute('aria-invalid', 'true'));
    expect(textbox('Position')).toHaveAccessibleDescription(/\S/);
    expect(calls).toHaveLength(0);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('sends 0 as a whole number, and asks for the numeric keyboard', async () => {
    const calls = captureCreate();
    const onDone = renderForm();

    expect(textbox('Position')).toHaveAttribute('inputmode', 'numeric');
    fillArticle();
    type('Position', '0');
    press('Save Article');

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(calls[0]?.input.position).toBe(0);
  });
});

// The preview is the standard sanitising renderer's (src/components/DocumentPage/markdown.tsx), whose own tests own its rules;
// these prove the body reaches it, and that nothing past it acts on a widget tag.
describe('HelpArticleForm, its Markdown preview', () => {
  const preview = () => screen.getByRole('region', { name: 'Preview' });

  it('renders the body as it is typed', () => {
    renderForm();

    expect(within(preview()).queryByRole('heading')).toBeNull();
    type('Body', '## Fixture Heading\n\nFixture paragraph.');

    expect(within(preview()).getByRole('heading', { name: 'Fixture Heading' })).toBeVisible();
  });

  it('prints raw HTML as text, never as an element', () => {
    renderForm();

    type(
      'Body',
      '<img src="x" alt="Fixture Injected">\n\n<script>window.fixtureRan = true</script>',
    );

    expect(within(preview()).queryByRole('img')).toBeNull();
    expect(preview().querySelector('script')).toBeNull();
    expect(preview()).toHaveTextContent('window.fixtureRan = true');
  });

  it('prints a widget tag as the text it was written as', () => {
    renderForm();

    type('Body', '::widget[jar-shelf]');

    expect(preview()).toHaveTextContent('::widget[jar-shelf]');
  });
});

// The form save rules (.claude/rules/components.md; the shared FormActions).
describe('HelpArticleForm, saving', () => {
  it('keeps Save off until something is entered', () => {
    renderForm();
    const save = () => button('Save Article');

    expect(save()).toBeDisabled();
    type('Title', 'T');
    expect(save()).toBeEnabled();
    type('Title', '');
    expect(save()).toBeDisabled();
  });

  it('keeps Save off on an edit until something changes, and off again once it is put back', () => {
    renderForm({ article: ARTICLE });
    const save = () => button('Save Article');

    expect(save()).toBeDisabled();
    type('Summary', 'A changed summary');
    expect(save()).toBeEnabled();
    type('Summary', ARTICLE.summary ?? '');
    expect(save()).toBeDisabled();
  });

  it('refuses a blank title and body before asking the server', async () => {
    const calls = captureCreate();
    const onDone = renderForm();

    type('Summary', 'Fixture summary');
    press('Save Article');

    await waitFor(() => expect(textbox('Title')).toHaveAttribute('aria-invalid', 'true'));
    expect(textbox('Title')).toHaveAccessibleDescription(/\S/);
    expect(textbox('Body')).toHaveAttribute('aria-invalid', 'true');
    expect(calls).toHaveLength(0);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('is busy and held down until the answer', async () => {
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      graphqlLink.mutation('CreateHelpArticle', async () => {
        await held;
        return HttpResponse.json({ data: CREATED });
      }),
    );
    const onDone = renderForm();
    fillArticle();
    const save = button('Save Article');
    press(save);

    await waitFor(() => expect(save).toHaveAttribute('aria-busy', 'true'));
    expect(save).toBeDisabled();
    release();
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it('is done without saving on Cancel', () => {
    const onDone = renderForm({ article: ARTICLE });

    press('Cancel');

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('asks before Cancel or Escape discards a change, and closes on Discard Changes', () => {
    const onClose = renderInModal((done) => (
      <HelpArticleForm article={ARTICLE} parents={PARENTS} onDone={done} />
    ));

    expectGuardedWaysOut(onClose, () => type('Summary', 'A change'));
  });
});

describe('HelpArticleForm, deleting', () => {
  it('has no Delete on a new row', () => {
    renderForm();

    expect(screen.queryByRole('button', { name: /^Delete/ })).toBeNull();
  });

  it('asks over the form first, and gives the form back on Cancel', () => {
    const onClose = renderInModal((done) => (
      <HelpArticleForm article={ARTICLE} parents={PARENTS} onDone={done} />
    ));

    press('Delete Article');

    const question = expectAskingOver(textbox('Title'), answer('Cancel'));
    press(answer('Cancel'));
    expectAnswered(textbox('Title'), question);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('deletes on confirmation, then is done', async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation('DeleteHelpArticle', (variables) => {
      calls.push(variables);
      return { deleteHelpArticle: ARTICLE.id };
    });
    const onDone = renderForm({ article: ARTICLE });

    press('Delete Article');
    // Precondition: asking is not deleting.
    expect(calls).toHaveLength(0);
    press('Delete');

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ id: ARTICLE.id }]);
  });

  it('shows the refusal of a parent with live children, and stays open', async () => {
    mockGraphQLError('DeleteHelpArticle', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['id'], message: 'Delete or move this article’s children first' }],
      message: 'Delete or move this article’s children first',
    });
    const onDone = renderForm({ article: ARTICLE });

    press('Delete Article');
    press('Delete');

    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(button('Delete Article')).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });

  it.each([
    { article: TERM, noun: 'Term' },
    { article: { ...ARTICLE, kind: 'faq' as const, parentId: null }, noun: 'FAQ Entry' },
  ])('names a $noun in its Save and Delete', ({ article, noun }) => {
    renderForm({ article });

    expect(button(`Save ${noun}`)).toBeInTheDocument();
    expect(button(`Delete ${noun}`)).toBeInTheDocument();
  });
});
