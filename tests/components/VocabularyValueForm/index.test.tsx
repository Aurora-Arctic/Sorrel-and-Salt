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
// shape (claude-docs/components/vocabulary-value-form.md). Every test runs on
// both vocabularies, which differ in their nouns and their mutations.

const VOCABULARIES = [
  { vocabulary: 'planets', type: 'Planet', noun: 'planet', listNoun: 'planets', label: 'Planet' },
  {
    vocabulary: 'zodiacSigns',
    type: 'ZodiacSign',
    noun: 'sign',
    listNoun: 'zodiac signs',
    label: 'Sign',
  },
] as const;

const VALUE = {
  id: '5a0e3c2b-7d6f-4e1a-9b8c-0f1e2d3c4b5a',
  name: 'Testwort Star',
  description: 'A value the test holds',
};

const RENAME_NOTE = 'Saving renames it on every compendium entry that lists it.';

describe.each(VOCABULARIES)(
  'VocabularyValueForm of $vocabulary',
  ({ vocabulary, type, noun, listNoun, label }) => {
    function renderForm(props: Partial<VocabularyValueFormProps> = {}) {
      const onDone = vi.fn();
      render(
        <QueryClientProvider client={makeQueryClient()}>
          <VocabularyValueForm vocabulary={vocabulary} onDone={onDone} {...props} />
        </QueryClientProvider>,
      );
      return onDone;
    }

    const name = () => screen.getByRole('textbox', { name: 'Name' });
    const description = () => screen.getByRole('textbox', { name: 'Description' });
    const save = () => screen.getByRole('button', { name: `Save ${label}` });
    const typeInto = (field: HTMLElement, value: string) =>
      fireEvent.change(field, { target: { value } });
    const press = (text: string) => {
      const button = screen.getByRole('button', { name: text });
      button.focus();
      fireEvent.click(button);
    };

    describe('adding', () => {
      it('starts empty, both fields required, with no group and nothing to delete', () => {
        renderForm();

        expect(name()).toHaveValue('');
        expect(description()).toHaveValue('');
        expect(name()).toHaveAttribute('aria-required', 'true');
        expect(description()).toHaveAttribute('aria-required', 'true');
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: `Delete ${label}` })).not.toBeInTheDocument();
      });

      it(`creates the ${noun} through create${type}, then is done`, async () => {
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

      // The owner's rule for every form: Save is offered only when there is something to save.
      it('keeps Save off until something is entered', () => {
        renderForm();

        expect(save()).toBeDisabled();
        typeInto(name(), 'T');
        expect(save()).toBeEnabled();
        typeInto(name(), '');
        expect(save()).toBeDisabled();
      });

      it('refuses a blank description before asking the server, in its own noun', async () => {
        const onDone = renderForm();

        typeInto(name(), 'Testwort Star');
        press(`Save ${label}`);

        expect(await screen.findByText(`Describe the ${noun}`)).toBeInTheDocument();
        expect(description()).toHaveAccessibleDescription(`Describe the ${noun}`);
        expect(onDone).not.toHaveBeenCalled();
      });

      it('says it is saving, busy and held down, until the answer', async () => {
        let release = () => {};
        const held = new Promise<void>((resolve) => {
          release = resolve;
        });
        server.use(
          graphqlLink.mutation(`Create${type}`, async () => {
            await held;
            return HttpResponse.json({ data: { [`create${type}`]: { id: VALUE.id } } });
          }),
        );
        const onDone = renderForm();
        typeInto(name(), 'Testwort Star');
        typeInto(description(), 'Held');
        press(`Save ${label}`);

        const busy = await screen.findByRole('button', { name: `Saving ${label}` });
        expect(busy).toBeDisabled();
        expect(busy).toHaveAttribute('aria-busy', 'true');
        release();
        await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      });

      it("lands the server's slug refusal beside Name, and a pathless one above the fields", async () => {
        const message =
          '"Testwort Star" already has the address "testwort-star" — choose another name';
        mockGraphQLError(`Create${type}`, {
          code: 'VALIDATION',
          fieldErrors: [
            { path: ['name'], message },
            { path: [], message: 'Something about the whole form' },
          ],
        });
        const onDone = renderForm();

        typeInto(name(), 'Testwort-Star');
        typeInto(description(), 'A clash');
        press(`Save ${label}`);

        expect(await screen.findByRole('alert')).toHaveTextContent(
          'Something about the whole form',
        );
        expect(name()).toHaveAccessibleDescription(message);
        expect(onDone).not.toHaveBeenCalled();
      });

      it('says nothing of renaming on a new value', () => {
        renderForm();

        typeInto(name(), 'Testwort Star');

        expect(screen.queryByText(RENAME_NOTE)).not.toBeInTheDocument();
      });
    });

    describe('editing', () => {
      it(`starts from the ${noun} as it is, and saves it whole under its id`, async () => {
        const calls: unknown[] = [];
        mockGraphQLMutation(`Update${type}`, (variables) => {
          calls.push(variables);
          return { [`update${type}`]: { id: VALUE.id } };
        });
        const onDone = renderForm({ value: VALUE });
        expect(name()).toHaveValue('Testwort Star');
        expect(description()).toHaveValue('A value the test holds');
        expect(save()).toBeDisabled();

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

      it('is done without saving on Cancel', () => {
        const onDone = renderForm({ value: VALUE });

        press('Cancel');

        expect(onDone).toHaveBeenCalledTimes(1);
      });

      // MB.162: a rename carries onto every compendium entry listing the value.
      it('says, by Save, that a rename carries onto the compendium, once the name changes', () => {
        renderForm({ value: VALUE });

        typeInto(description(), 'Described again');
        expect(screen.queryByText(RENAME_NOTE)).not.toBeInTheDocument();

        typeInto(name(), 'Testwort Comet');
        expect(screen.getByText(RENAME_NOTE)).toBeInTheDocument();
        expect(save()).toHaveAccessibleDescription(RENAME_NOTE);

        typeInto(name(), 'Testwort Star ');
        expect(screen.queryByText(RENAME_NOTE)).not.toBeInTheDocument();
      });
    });

    describe('deleting', () => {
      const CONFIRM =
        'Delete "Testwort Star"? It can\'t be deleted while a compendium entry lists it. Covens\' ingredients keep what they wrote, which then counts as their own value rather than a curated one; nothing of theirs changes.';

      it('asks first, saying what it does, and deletes nothing on Keep It', () => {
        const onDone = renderForm({ value: VALUE });

        press(`Delete ${label}`);

        expect(screen.getByText(CONFIRM)).toBeInTheDocument();
        press('Keep It');
        expect(screen.getByRole('button', { name: `Delete ${label}` })).toBeInTheDocument();
        expect(onDone).not.toHaveBeenCalled();
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

      it('shows the refusal of a value a compendium entry lists, and stays open', async () => {
        const message = `"Testwort Star" is among the ${listNoun} of 1 compendium entry — Testwort. Take it off its ${listNoun} first.`;
        mockGraphQLError(`Delete${type}`, { code: 'FORBIDDEN', message });
        const onDone = renderForm({ value: VALUE });

        press(`Delete ${label}`);
        press('Delete');

        expect(await screen.findByRole('alert')).toHaveTextContent(message);
        expect(screen.getByRole('button', { name: `Delete ${label}` })).toBeInTheDocument();
        expect(onDone).not.toHaveBeenCalled();
      });
    });
  },
);
