import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import ReferencePanel from '@/components/IngredientForm/reference-panel';
import type { CreateReferenceMutation, CreateReferenceMutationVariables } from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import {
  chooseKind,
  inPanel,
  labelled,
  referencePanel,
  renderWithClient,
} from '../../support/ingredient-form';
import { press, typeIn } from '../../support/interact';
import { graphqlLink, mockGraphQLError } from '../../support/msw/graphql';
import {
  NEW_REFERENCE_ID,
  WORKSPACE_ID,
  acceptReference,
  offerReference,
} from '../../support/msw/ingredient-lookups';
import { server } from '../../support/msw/server';

// The new reference panel on its own: `ReferencePanel`, the citation
// sub-form beneath the References field, saving through MSW as
// /api/graphql answers. How the field opens it, lists what it saves and is
// held while it is open is references.test.tsx's; what the schema refuses and
// how each field is tidied is tests/modules/ingredients/validation/'s
// (claude-docs/components/ingredient-form.md, "Testing").

/**
 * The panel, asked for `summons` times; `summon` asks for it again, as New
 * Reference does. Rendered here rather than by `renderWithClient`: a summons
 * re-renders the panel under the client it opened with.
 */
function renderPanel() {
  const onSaved = vi.fn();
  const onCancel = vi.fn();
  const client = makeQueryClient();
  const panelFor = (summons: number) => (
    <QueryClientProvider client={client}>
      <ReferencePanel
        workspaceId={WORKSPACE_ID}
        summons={summons}
        onSaved={onSaved}
        onCancel={onCancel}
      />
    </QueryClientProvider>
  );
  const { rerender } = render(panelFor(1));
  return { onSaved, onCancel, summon: (summons: number) => rerender(panelFor(summons)) };
}

const panel = () => referencePanel();
const notInPanel = (label: string) =>
  expect(within(panel()).queryByLabelText(labelled(label))).toBeNull();
const kindBox = () => within(panel()).getByRole('combobox', { name: 'Kind' });
const saveReference = () => press(within(panel()).getByRole('button', { name: 'Save Reference' }));

/** Every label a panel field may carry, across the five kinds. */
const ALL_LABELS = [
  'Title',
  'Chapter Title',
  'Article Title',
  'Entry',
  'Page Title',
  'Book',
  'Journal',
  'Reference Work',
  'Site',
  'Authors',
  'Contributors',
  'Edition',
  'Volume',
  'Issue',
  'Series',
  'Place',
  'Publisher',
  'Published',
  'Pages',
  'Read Through',
  'Address',
  'Last Modified',
  'Accessed',
  'Note',
];
const TAIL = ['Read Through', 'Address', 'Last Modified', 'Accessed', 'Note'];

/** Each kind: its choice's label, its fields in order, and the ones it requires. */
const KINDS = [
  {
    kind: 'book',
    label: 'Book',
    fields: [
      'Title',
      'Authors',
      'Contributors',
      'Edition',
      'Volume',
      'Series',
      'Place',
      'Publisher',
      'Published',
      ...TAIL,
    ],
    required: ['Title', 'Published'],
  },
  {
    kind: 'chapter',
    label: 'Chapter in a Book',
    fields: [
      'Chapter Title',
      'Book',
      'Authors',
      'Contributors',
      'Pages',
      'Edition',
      'Volume',
      'Series',
      'Place',
      'Publisher',
      'Published',
      ...TAIL,
    ],
    required: ['Chapter Title', 'Book'],
  },
  {
    kind: 'article',
    label: 'Journal Article',
    fields: [
      'Article Title',
      'Journal',
      'Authors',
      'Volume',
      'Issue',
      'Published',
      'Pages',
      ...TAIL,
    ],
    required: ['Article Title', 'Journal'],
  },
  {
    kind: 'entry',
    label: 'Reference-Work Entry',
    fields: [
      'Entry',
      'Reference Work',
      'Authors',
      'Edition',
      'Contributors',
      'Place',
      'Publisher',
      'Published',
      ...TAIL,
    ],
    required: ['Entry', 'Reference Work'],
  },
  {
    kind: 'web_page',
    label: 'Web Page',
    fields: [
      'Page Title',
      'Site',
      'Authors',
      'Publisher',
      'Published',
      'Last Modified',
      'Address',
      'Accessed',
      'Note',
    ],
    required: ['Page Title', 'Address', 'Accessed'],
  },
] as const;

describe('ReferencePanel', () => {
  it('opens with Kind focused and no other field until one is chosen', () => {
    renderPanel();

    expect(kindBox()).toHaveFocus();
    for (const label of ALL_LABELS) notInPanel(label);
  });

  // Asking again for a panel already open takes you
  // back to it, rather than doing nothing.
  it('takes you back to Kind when asked again while open, keeping what was typed', () => {
    const { summon } = renderPanel();
    chooseKind('Book');
    typeIn(inPanel('Title'), 'The Testwort Herbal');
    inPanel('Title').focus();

    summon(2);

    expect(kindBox()).toHaveFocus();
    expect(inPanel('Title')).toHaveValue('The Testwort Herbal');
  });

  it.each(KINDS)(
    'shows only the fields a $label needs, marking the required ones',
    ({ label, fields, required }) => {
      renderPanel();

      chooseKind(label);

      const controls = fields.map((field) => inPanel(field));
      for (const [index, control] of controls.entries()) {
        const marked = (required as readonly string[]).includes(fields[index]);
        if (marked) expect(control).toHaveAttribute('aria-required', 'true');
        else expect(control).not.toHaveAttribute('aria-required');
      }
      for (const other of ALL_LABELS.filter(
        (name) => !(fields as readonly string[]).includes(name),
      )) {
        notInPanel(other);
      }
    },
  );

  // One tip for how to cite, read once on entering the panel, in place of a
  // hint beside each field.
  it('describes the panel by one How to Cite tip, and no field by a hint of its own', () => {
    renderPanel();

    chooseKind('Book');

    const tips = within(panel()).getAllByRole('button', { name: /^About / });
    expect(tips.map((tip) => tip.getAttribute('aria-label'))).toEqual(['About How to Cite']);
    const tipId = tips[0].getAttribute('aria-describedby');
    expect(tipId).toBeTruthy();
    expect(panel().getAttribute('aria-describedby')?.split(' ')).toContain(tipId);
    for (const label of KINDS[0].fields) expect(inPanel(label)).not.toHaveAccessibleDescription();
  });

  // One rule to a line, a list a screen reader can step through,
  // rather than one run-on paragraph.
  it('gives How to Cite one list item per rule', () => {
    renderPanel();

    const tipId = within(panel())
      .getByRole('button', { name: 'About How to Cite' })
      .getAttribute('aria-describedby');
    const tip = screen.getAllByRole('tooltip', { hidden: true }).find((el) => el.id === tipId);
    if (!tip) throw new Error('No How to Cite tip');
    const list = within(tip).getByRole('list', { hidden: true });
    expect(within(list).getAllByRole('listitem', { hidden: true }).length).toBeGreaterThan(1);
  });

  // What the schema refuses is validation/reference.test.ts's; here, that the
  // panel runs it, and where a refusal and a server's land.
  it('puts a resolver error beside its field, focused and sending nothing, and a server field error through the same element', async () => {
    const calls = acceptReference();
    renderPanel();

    chooseKind('Book');
    typeIn(inPanel('Published'), '1901');
    saveReference();
    await waitFor(() => expect(inPanel('Title')).toBeInvalid());
    expect(inPanel('Title')).toHaveFocus();
    expect(calls).toHaveLength(0);
    const resolverError = inPanel('Title').getAttribute('aria-describedby');

    mockGraphQLError('CreateReference', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['title'], message: 'That title is taken' }],
    });
    typeIn(inPanel('Title'), 'The Testwort Herbal');
    saveReference();

    await waitFor(() => expect(inPanel('Title')).toBeInvalid());
    expect(inPanel('Title')).toHaveAccessibleDescription(/\S/);
    expect(inPanel('Title').getAttribute('aria-describedby')).toBe(resolverError);
  });

  it('says a refusal naming no field inside the panel', async () => {
    mockGraphQLError('CreateReference', { code: 'FORBIDDEN', message: 'Not yours.' });
    renderPanel();

    chooseKind('Book');
    typeIn(inPanel('Title'), 'The Testwort Herbal');
    typeIn(inPanel('Published'), '1901');
    saveReference();

    expect(await within(panel()).findByRole('alert')).toBeVisible();
  });

  it('saves a new source to this coven, handing back what was saved', async () => {
    const calls = acceptReference();
    const { onSaved } = renderPanel();

    chooseKind('Book');
    typeIn(inPanel('Title'), 'A Fixture Grimoire');
    typeIn(inPanel('Authors'), 'Mock, Cyril');
    typeIn(inPanel('Published'), '1999');
    saveReference();

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(onSaved).toHaveBeenCalledWith({
      id: NEW_REFERENCE_ID,
      citation: 'Mock, Cyril. A Fixture Grimoire. Mockford, 1999.',
      isGlobal: false,
      // What its row's short form is made of.
      kind: 'book',
      authors: 'Mock, Cyril',
      title: 'A Fixture Grimoire',
      container: null,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].workspaceId).toBe(WORKSPACE_ID);
    expect(calls[0].input).toMatchObject({
      kind: 'book',
      title: 'A Fixture Grimoire',
      authors: 'Mock, Cyril',
      published: '1999',
      // A day left blank goes as none: the scalar takes no empty text.
      accessed: null,
      modified: null,
    });
  });

  it("sends only the chosen kind's fields, leaving what another kind took behind", async () => {
    const calls = acceptReference();
    renderPanel();

    chooseKind('Web Page');
    typeIn(inPanel('Page Title'), 'Mockleaf');
    typeIn(inPanel('Site'), 'Fixture Wiki');
    chooseKind('Book');
    typeIn(inPanel('Published'), '1999');
    // What was typed is kept for its own kind.
    expect(inPanel('Title')).toHaveValue('Mockleaf');
    saveReference();

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0].input).toMatchObject({ kind: 'book', title: 'Mockleaf', container: null });
  });

  // Enter would submit the ingredient form around the panel; held back, it
  // saves the source instead.
  it('saves the reference, not the ingredient, on Enter in one of its fields', async () => {
    const calls = acceptReference();
    const { onSaved } = renderPanel();

    chooseKind('Book');
    typeIn(inPanel('Title'), 'A Fixture Grimoire');
    typeIn(inPanel('Published'), '1999');
    const enter = fireEvent.keyDown(inPanel('Published'), { key: 'Enter' });

    expect(enter).toBe(false);
    await waitFor(() => expect(calls).toHaveLength(1));
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  });

  // Each field is tidied as it is left, as the
  // server will store it, so what is seen is what is saved. Each format is
  // FORMAT_OF's (validation/reference-format.test.ts); here, that the panel
  // applies its field's.
  it('tidies each field by its own format as it is left', () => {
    renderPanel();
    chooseKind('Book');

    for (const [label, typed, formatted] of [
      ['Title', '  "A Fixture   Grimoire" ', 'A Fixture Grimoire'],
      ['Edition', 'second edition', '2nd ed.'],
      ['Published', '1882-88', '1882–88'],
      ['Address', 'example.org/grimoire', 'https://example.org/grimoire'],
    ]) {
      typeIn(inPanel(label), typed);
      fireEvent.blur(inPanel(label));
      expect(inPanel(label)).toHaveValue(formatted);
    }
  });

  // As the ingredient's saves are held: busy, and saying so.
  it('holds Save Reference down while it is in flight, busy and saying so, and Cancel with it', async () => {
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      graphqlLink.mutation<CreateReferenceMutation, CreateReferenceMutationVariables>(
        'CreateReference',
        async () => {
          await held;
          return HttpResponse.json({
            data: {
              createReference: {
                id: NEW_REFERENCE_ID,
                citation: 'A Fixture Grimoire. 1999.',
                isGlobal: false,
                kind: 'book',
                authors: null,
                title: 'A Fixture Grimoire',
                container: null,
              },
            },
          });
        },
      ),
    );
    const { onSaved } = renderPanel();
    chooseKind('Book');
    typeIn(inPanel('Title'), 'A Fixture Grimoire');
    typeIn(inPanel('Published'), '1999');
    const saveButton = within(panel()).getByRole('button', { name: 'Save Reference' });
    const cancel = within(panel()).getByRole('button', { name: 'Cancel' });

    press(saveButton);

    await waitFor(() => expect(saveButton).toBeDisabled());
    expect(saveButton).toHaveAttribute('aria-busy', 'true');
    expect(cancel).toBeDisabled();
    release();
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    await waitFor(() => expect(saveButton).not.toHaveAttribute('aria-busy'));
  });

  it('cancels from Cancel, sending nothing', () => {
    const calls = acceptReference();
    const { onCancel } = renderPanel();

    chooseKind('Book');
    press(within(panel()).getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(calls).toHaveLength(0);
  });

  // The edit saves through the same handling, so a refusal of the
  // edited source lands beside its field as a new one's does.
  it('puts a server field error on an edited source beside its field', async () => {
    offerReference({
      id: NEW_REFERENCE_ID,
      kind: 'book',
      title: 'A Fixture Grimoire',
      authors: 'Mock, Cyril',
      container: null,
      contributors: null,
      edition: null,
      volume: null,
      issue: null,
      series: null,
      place: 'Mockford',
      publisher: null,
      published: '1999',
      pages: null,
      host: null,
      url: null,
      modified: null,
      accessed: null,
      note: null,
    });
    mockGraphQLError('UpdateReference', {
      code: 'VALIDATION',
      fieldErrors: [{ path: ['published'], message: 'Give the year it was published' }],
    });
    renderWithClient(
      <ReferencePanel
        workspaceId={WORKSPACE_ID}
        editing={{
          id: NEW_REFERENCE_ID,
          isGlobal: false,
          kind: 'book',
          authors: 'Mock, Cyril',
          title: 'A Fixture Grimoire',
          container: null,
        }}
        summons={1}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const editPanel = () => screen.getByRole('group', { name: 'Edit Source' });
    const published = await waitFor(() =>
      within(editPanel()).getByLabelText(labelled('Published')),
    );
    expect(published).toHaveValue('1999');

    typeIn(published, '2001');
    press(within(editPanel()).getByRole('button', { name: 'Save Source' }));

    await waitFor(() => expect(published).toBeInvalid());
    expect(published).toHaveAccessibleDescription(/\S/);
  });
});
