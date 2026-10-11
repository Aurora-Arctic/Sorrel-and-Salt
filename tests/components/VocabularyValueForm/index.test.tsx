import { QueryClientProvider } from '@tanstack/react-query';
import { HttpResponse } from 'msw';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import VocabularyValueForm from '@/components/VocabularyValueForm';
import type { VocabularyValueFormProps } from '@/components/VocabularyValueForm/types';
import { makeQueryClient } from '@/lib/graphql-client';
import { graphqlLink, mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';

// The admin's form for a flat curated vocabulary (MB.95): a name and a
// description, saved through the vocabulary's own mutations, and on an
// existing value a delete behind a confirmation. A rename says it carries
// onto the compendium. The mutations are answered by MSW in the route's own
// shape (claude-docs/components/vocabulary-value-form.md). The two
// vocabularies differ only in their nouns and their mutations, so the shared
// behaviour runs on the planets and each vocabulary's mutations on both.

const VOCABULARIES = [
  { vocabulary: 'planets', type: 'Planet', label: 'Planet' },
  { vocabulary: 'zodiacSigns', type: 'ZodiacSign', label: 'Sign' },
] as const;

const VALUE = {
  id: '5a0e3c2b-7d6f-4e1a-9b8c-0f1e2d3c4b5a',
  name: 'Testwort Star',
  description: 'A value the test holds',
};

/** The form and its controls, for one vocabulary. */
function formFor({ vocabulary, label }: (typeof VOCABULARIES)[number]) {
  function renderForm(props: Partial<VocabularyValueFormProps> = {}) {
    const onDone = vi.fn();
    const { unmount } = render(
      <QueryClientProvider client={makeQueryClient()}>
        <VocabularyValueForm vocabulary={vocabulary} onDone={onDone} {...props} />
      </QueryClientProvider>,
    );
    return Object.assign(onDone, { unmount });
  }
  return {
    renderForm,
    save: () => screen.getByRole('button', { name: `Save ${label}` }),
  };
}

const name = () => screen.getByRole('textbox', { name: 'Name' });
const description = () => screen.getByRole('textbox', { name: 'Description' });
const typeInto = (field: HTMLElement, value: string) =>
  fireEvent.change(field, { target: { value } });
const press = (text: string) => {
  const button = screen.getByRole('button', { name: text });
  button.focus();
  fireEvent.click(button);
};

describe.each(VOCABULARIES)('VocabularyValueForm, the mutations of $vocabulary', (subject) => {
  const { type, label } = subject;
  const { renderForm } = formFor(subject);

  it(`creates through create${type}, then is done`, async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation(`Create${type}`, (variables) => {
      calls.push(variables);
      return { [`create${type}`]: { id: VALUE.id } };
    });
    const onDone = renderForm();

    typeInto(name(), ' Testwort Star ');
    typeInto(description(), 'A value the test made');
    press(`Save ${label}`);

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([
      { input: { name: 'Testwort Star', description: 'A value the test made' } },
    ]);
  });

  it(`starts from the value as it is, and saves it whole under its id through update${type}`, async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation(`Update${type}`, (variables) => {
      calls.push(variables);
      return { [`update${type}`]: { id: VALUE.id } };
    });
    const onDone = renderForm({ value: VALUE });
    expect(name()).toHaveValue('Testwort Star');
    expect(description()).toHaveValue('A value the test holds');
    expect(screen.getByRole('button', { name: `Save ${label}` })).toBeDisabled();

    typeInto(name(), 'Testwort Comet');
    press(`Save ${label}`);

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([
      {
        id: VALUE.id,
        input: { name: 'Testwort Comet', description: 'A value the test holds' },
      },
    ]);
  });

  it(`deletes on confirmation through delete${type}, then is done`, async () => {
    const calls: unknown[] = [];
    mockGraphQLMutation(`Delete${type}`, (variables) => {
      calls.push(variables);
      return { [`delete${type}`]: VALUE.id };
    });
    const onDone = renderForm({ value: VALUE });

    press(`Delete ${label}`);
    press('Delete');

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ id: VALUE.id }]);
  });
});

describe('VocabularyValueForm', () => {
  const { renderForm, save } = formFor(VOCABULARIES[0]);

  describe('adding', () => {
    // The owner's rule for every form: Save is offered only when there is something to save.
    it('starts empty, both fields required, with no group, nothing to delete, and Save off until something is entered', () => {
      renderForm();

      expect(name()).toHaveValue('');
      expect(description()).toHaveValue('');
      expect(name()).toHaveAttribute('aria-required', 'true');
      expect(description()).toHaveAttribute('aria-required', 'true');
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Delete Planet' })).not.toBeInTheDocument();
      expect(save()).toBeDisabled();
      typeInto(name(), 'T');
      expect(save()).toBeEnabled();
      typeInto(name(), '');
      expect(save()).toBeDisabled();
    });

    it('refuses a blank description before asking the server', async () => {
      const onDone = renderForm();

      typeInto(name(), 'Testwort Star');
      press('Save Planet');

      await waitFor(() => expect(description()).toHaveAttribute('aria-invalid', 'true'));
      expect(description()).toHaveAccessibleDescription(/\S/);
      expect(onDone).not.toHaveBeenCalled();
    });

    it('is busy and held down until the answer', async () => {
      let release = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      server.use(
        graphqlLink.mutation('CreatePlanet', async () => {
          await held;
          return HttpResponse.json({ data: { createPlanet: { id: VALUE.id } } });
        }),
      );
      const onDone = renderForm();
      typeInto(name(), 'Testwort Star');
      typeInto(description(), 'Held');
      const busy = save();
      press('Save Planet');

      await waitFor(() => expect(busy).toHaveAttribute('aria-busy', 'true'));
      expect(busy).toBeDisabled();
      release();
      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    });

    it("lands the server's slug refusal beside Name, and a pathless one above the fields", async () => {
      mockGraphQLError('CreatePlanet', {
        code: 'VALIDATION',
        fieldErrors: [
          {
            path: ['name'],
            message:
              '"Testwort Star" already has the address "testwort-star" — choose another name',
          },
          { path: [], message: 'Something about the whole form' },
        ],
      });
      const onDone = renderForm();

      typeInto(name(), 'Testwort-Star');
      typeInto(description(), 'A clash');
      press('Save Planet');

      expect(await screen.findByRole('alert')).toBeVisible();
      expect(name()).toHaveAttribute('aria-invalid', 'true');
      expect(name()).toHaveAccessibleDescription(/\S/);
      expect(onDone).not.toHaveBeenCalled();
    });
  });

  describe('editing', () => {
    it('is done without saving on Cancel', () => {
      const onDone = renderForm({ value: VALUE });

      press('Cancel');

      expect(onDone).toHaveBeenCalledTimes(1);
    });

    // MB.162: a rename carries onto every compendium entry listing the value,
    // and Save is described by the note saying so. A new value renames nothing.
    it('describes Save by the rename note once the name changes, and only then', () => {
      const adding = renderForm();
      typeInto(name(), 'Testwort Star');
      expect(save()).toHaveAccessibleDescription('');
      adding.unmount();

      renderForm({ value: VALUE });
      typeInto(description(), 'Described again');
      expect(save()).toHaveAccessibleDescription('');

      typeInto(name(), 'Testwort Comet');
      expect(save()).toHaveAccessibleDescription(/\S/);

      typeInto(name(), 'Testwort Star ');
      expect(save()).toHaveAccessibleDescription('');
    });
  });

  describe('deleting', () => {
    it('asks first, and deletes nothing on Keep It', () => {
      const onDone = renderForm({ value: VALUE });

      press('Delete Planet');

      expect(screen.getByRole('button', { name: 'Delete' })).toBeVisible();
      press('Keep It');
      expect(screen.getByRole('button', { name: 'Delete Planet' })).toBeInTheDocument();
      expect(onDone).not.toHaveBeenCalled();
    });

    it('shows the refusal of a value a compendium entry lists, and stays open', async () => {
      mockGraphQLError('DeletePlanet', {
        code: 'FORBIDDEN',
        message:
          '"Testwort Star" is among the planets of 1 compendium entry — Testwort. Take it off its planets first.',
      });
      const onDone = renderForm({ value: VALUE });

      press('Delete Planet');
      press('Delete');

      expect(await screen.findByRole('alert')).toBeVisible();
      expect(screen.getByRole('button', { name: 'Delete Planet' })).toBeInTheDocument();
      expect(onDone).not.toHaveBeenCalled();
    });
  });
});
