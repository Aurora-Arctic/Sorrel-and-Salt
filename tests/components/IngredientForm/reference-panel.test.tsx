import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import ReferencePanel from '@/components/IngredientForm/reference-panel';
import type { CreateReferenceMutation, CreateReferenceMutationVariables } from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { graphqlLink, mockGraphQLError } from '../../support/msw/graphql';
import {
  NEW_REFERENCE_ID,
  WORKSPACE_ID,
  acceptReference,
} from '../../support/msw/ingredient-lookups';
import { server } from '../../support/msw/server';

// The new reference panel on its own (MB.182): `ReferencePanel`, the citation
// sub-form MB.154 puts beneath the References field, saving through MSW as
// /api/graphql answers. How the field opens it, lists what it saves and is
// held while it is open is references.test.tsx's; what the schema refuses and
// how each field is tidied is tests/modules/ingredients/validation/'s
// (claude-docs/components/ingredient-form.md, "Testing").

/** The panel, asked for `summons` times; `summon` asks for it again, as New Reference does. */
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

const panel = () => screen.getByRole('group', { name: 'New Reference' });
/** A label's text less a required field's asterisk, which is hidden from its name. */
const labelled = (label: string) => (content: string) => content.replace(/\*$/, '') === label;
const inPanel = (label: string) => within(panel()).getByLabelText(labelled(label));
const notInPanel = (label: string) =>
  expect(within(panel()).queryByLabelText(labelled(label))).toBeNull();
const kindBox = () => within(panel()).getByRole('combobox', { name: 'Kind' });
const typeIn = (control: HTMLElement, value: string) =>
  fireEvent.change(control, { target: { value } });
/** Presses a button, focusing it first as a real click would: fireEvent moves no focus. */
const press = (button: HTMLElement) => {
  button.focus();
  fireEvent.click(button);
};
const saveReference = () => press(within(panel()).getByRole('button', { name: 'Save Reference' }));
const chooseKind = (label: string) => {
  fireEvent.click(kindBox());
  fireEvent.click(
    within(screen.getByRole('listbox', { name: 'Kind choices' })).getByRole('option', {
      name: label,
    }),
  );
};

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

  // The owner's call: asking again for a panel already open takes you
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
    'shows only the fields a $label needs, in order, marking the required ones',
    ({ label, fields, required }) => {
      renderPanel();

      chooseKind(label);

      const controls = fields.map((field) => inPanel(field));
      for (const [index, control] of controls.entries()) {
        if (index > 0) {
          // Each after the last, in the page.
          expect(
            controls[index - 1].compareDocumentPosition(control) & Node.DOCUMENT_POSITION_FOLLOWING,
          ).toBeTruthy();
        }
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

  // MB.154, the owner's calls: each field is tidied as it is left, as the
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

  // As the ingredient's saves are held, the owner's call: busy, and saying so.
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
});
