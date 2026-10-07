import { QueryClientProvider } from '@tanstack/react-query';
import { HttpResponse } from 'msw';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import IngredientFormValueForm from '@/components/IngredientFormValueForm';
import type { IngredientFormValueFormProps } from '@/components/IngredientFormValueForm/types';
import type {
  CreateIngredientFormValueMutation,
  CreateIngredientFormValueMutationVariables,
  DeleteIngredientFormValueMutation,
  DeleteIngredientFormValueMutationVariables,
  UpdateIngredientFormValueMutation,
  UpdateIngredientFormValueMutationVariables,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { graphqlLink, mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';
import { server } from '../../support/msw/server';

// The admin's form form (M5.6a): a name, a description and a form group,
// saved through the ingredient-form mutations, and on an existing form a
// delete behind a confirmation. A rename says it carries onto the compendium,
// and one that would end another entry's redirect asks before it is sent
// again (MB.82). The mutations are answered by MSW in the route's own shape
// (claude-docs/components/ingredient-form-value-form.md).

const GROUPS = [
  { id: '0b9f0f6e-2f4c-4d7a-9a52-3c1c5b8e6d21', name: 'Fixture Mineral' },
  { id: '1c8e1e5d-3e5b-4c6a-8b41-2d0b4a7d5c10', name: 'Fixture Substance' },
];

const FORM = {
  id: '5a0e3c2b-7d6f-4e1a-9b8c-0f1e2d3c4b5a',
  name: 'Testwort Shard',
  description: 'A form the test holds',
  groupId: GROUPS[1].id,
};

function renderForm(props: Partial<IngredientFormValueFormProps> = {}) {
  const onDone = vi.fn();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <IngredientFormValueForm groups={GROUPS} onDone={onDone} {...props} />
    </QueryClientProvider>,
  );
  return onDone;
}

const name = () => screen.getByRole('textbox', { name: 'Name' });
const description = () => screen.getByRole('textbox', { name: 'Description' });
const group = () => screen.getByRole('combobox', { name: 'Group' });
const save = () => screen.getByRole('button', { name: 'Save Form' });
const chooseGroup = (label: string) => {
  fireEvent.click(group());
  fireEvent.click(
    within(screen.getByRole('listbox', { name: 'Group choices' })).getByRole('option', {
      name: label,
    }),
  );
};
const type = (field: HTMLElement, value: string) => fireEvent.change(field, { target: { value } });
const press = (label: string) => {
  const button = screen.getByRole('button', { name: label });
  button.focus();
  fireEvent.click(button);
};

const RENAME_NOTE =
  "Saving renames it on every compendium entry that picked it, which can move those entries' addresses.";

describe('IngredientFormValueForm', () => {
  describe('adding', () => {
    it('starts empty, the group unchosen, with nothing to delete', () => {
      renderForm();

      expect(name()).toHaveValue('');
      expect(description()).toHaveValue('');
      expect(group()).toHaveTextContent('Choose a group');
      expect(screen.queryByRole('button', { name: 'Delete Form' })).not.toBeInTheDocument();
    });

    it('creates the form from what was entered, then is done', async () => {
      const calls: CreateIngredientFormValueMutationVariables[] = [];
      mockGraphQLMutation<
        CreateIngredientFormValueMutation,
        CreateIngredientFormValueMutationVariables
      >('CreateIngredientFormValue', (variables) => {
        calls.push(variables);
        return {
          createIngredientFormValue: { id: FORM.id, slug: 'testwort-shard-fixture-mineral' },
        };
      });
      const onDone = renderForm();

      type(name(), 'Testwort Shard');
      type(description(), 'A form the test made');
      chooseGroup('Fixture Mineral');
      press('Save Form');

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      expect(calls).toEqual([
        {
          input: {
            name: 'Testwort Shard',
            description: 'A form the test made',
            groupId: GROUPS[0].id,
          },
        },
      ]);
    });

    it('marks every field required', () => {
      renderForm();

      // The asterisk is for the eye; the name stays the label alone.
      expect(name()).toHaveAttribute('aria-required', 'true');
      expect(description()).toHaveAttribute('aria-required', 'true');
      expect(group()).toBeRequired();
    });

    // The owner's rule for every form: Save is offered only when there is
    // something to save.
    it('keeps Save off until something is entered', () => {
      renderForm();

      expect(save()).toBeDisabled();
      type(name(), 'T');
      expect(save()).toBeEnabled();
      type(name(), '');
      expect(save()).toBeDisabled();
    });

    it('refuses a blank description and group before asking the server', async () => {
      const onDone = renderForm();

      type(name(), 'Testwort Shard');
      press('Save Form');

      expect(await screen.findByText('Describe the form')).toBeInTheDocument();
      expect(description()).toHaveAccessibleDescription('Describe the form');
      expect(group()).toHaveAccessibleDescription('Choose a group');
      expect(onDone).not.toHaveBeenCalled();
    });

    it('says nothing of renaming on a new form', () => {
      renderForm();

      type(name(), 'Testwort Shard');

      expect(screen.queryByText(RENAME_NOTE)).not.toBeInTheDocument();
    });

    it('says it is saving, busy and held down, until the answer', async () => {
      let release = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      server.use(
        graphqlLink.mutation('CreateIngredientFormValue', async () => {
          await held;
          return HttpResponse.json({
            data: { createIngredientFormValue: { id: FORM.id, slug: 'testwort-shard' } },
          });
        }),
      );
      const onDone = renderForm();
      type(name(), 'Testwort Shard');
      type(description(), 'Held');
      chooseGroup('Fixture Mineral');
      press('Save Form');

      const busy = await screen.findByRole('button', { name: 'Saving Form' });
      expect(busy).toBeDisabled();
      expect(busy).toHaveAttribute('aria-busy', 'true');
      release();
      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    });

    it("lands the server's slug refusal beside Name", async () => {
      const message =
        '"Testwort Shard" already has the address "testwort-shard-fixture-mineral" — choose another name';
      mockGraphQLError('CreateIngredientFormValue', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['name'], message }],
      });
      const onDone = renderForm();

      type(name(), 'Testwort-Shard');
      type(description(), 'A clash');
      chooseGroup('Fixture Mineral');
      press('Save Form');

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(name()).toHaveAccessibleDescription(message);
      expect(onDone).not.toHaveBeenCalled();
    });

    it("lands the server's group refusal beside Group, and a pathless one above the fields", async () => {
      mockGraphQLError('CreateIngredientFormValue', {
        code: 'VALIDATION',
        fieldErrors: [
          { path: ['groupId'], message: 'No live group has that id' },
          { path: [], message: 'Something about the whole form' },
        ],
      });
      renderForm();

      type(name(), 'Testwort Shard');
      type(description(), 'Grouped');
      chooseGroup('Fixture Mineral');
      press('Save Form');

      expect(await screen.findByRole('alert')).toHaveTextContent('Something about the whole form');
      expect(group()).toHaveAccessibleDescription('No live group has that id');
    });
  });

  describe('editing', () => {
    it('starts from the form as it is', () => {
      renderForm({ formValue: FORM });

      expect(name()).toHaveValue('Testwort Shard');
      expect(description()).toHaveValue('A form the test holds');
      expect(group()).toHaveTextContent('Fixture Substance');
    });

    it('saves the whole form under its id, then is done', async () => {
      const calls: UpdateIngredientFormValueMutationVariables[] = [];
      mockGraphQLMutation<
        UpdateIngredientFormValueMutation,
        UpdateIngredientFormValueMutationVariables
      >('UpdateIngredientFormValue', (variables) => {
        calls.push(variables);
        return { updateIngredientFormValue: { id: FORM.id, slug: 'testwort-sliver' } };
      });
      const onDone = renderForm({ formValue: FORM });

      type(name(), 'Testwort Sliver');
      press('Save Form');

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      expect(calls).toEqual([
        {
          id: FORM.id,
          input: {
            name: 'Testwort Sliver',
            description: 'A form the test holds',
            groupId: GROUPS[1].id,
          },
        },
      ]);
    });

    it('keeps Save off until something changes, and off again once it is put back', () => {
      renderForm({ formValue: FORM });

      expect(save()).toBeDisabled();
      chooseGroup('Fixture Mineral');
      expect(save()).toBeEnabled();
      chooseGroup('Fixture Substance');
      expect(save()).toBeDisabled();
    });

    it('is done without saving on Cancel', () => {
      const onDone = renderForm({ formValue: FORM });

      press('Cancel');

      expect(onDone).toHaveBeenCalledTimes(1);
    });

    // MB.162: a rename carries onto every compendium entry that picked the
    // form, and a form is part of an entry's slug.
    it('says, by Save, that a rename carries onto the compendium, once the name changes', () => {
      renderForm({ formValue: FORM });

      expect(screen.queryByText(RENAME_NOTE)).not.toBeInTheDocument();
      type(description(), 'Described again');
      expect(screen.queryByText(RENAME_NOTE)).not.toBeInTheDocument();

      type(name(), 'Testwort Sliver');
      expect(screen.getByText(RENAME_NOTE)).toBeInTheDocument();
      expect(save()).toHaveAccessibleDescription(RENAME_NOTE);

      type(name(), 'Testwort Shard');
      expect(screen.queryByText(RENAME_NOTE)).not.toBeInTheDocument();
    });
  });

  // MB.82: a rename re-slugs the entries that picked the form, and taking a
  // slug another entry redirects from asks first.
  describe('a rename that would end a redirect', () => {
    const REDIRECT =
      '"testwort-sliver" redirects to Testwort (Fixtura testalis), sliver until 28 August 2026, 00:00 UTC — confirm to end that redirect';

    it('asks, naming the redirect, then sends the same input again with endRedirect', async () => {
      const calls: UpdateIngredientFormValueMutationVariables[] = [];
      server.use(
        graphqlLink.mutation<
          UpdateIngredientFormValueMutation,
          UpdateIngredientFormValueMutationVariables
        >('UpdateIngredientFormValue', ({ variables }) => {
          calls.push(variables);
          if (variables.input.endRedirect) {
            return HttpResponse.json({
              data: { updateIngredientFormValue: { id: FORM.id, slug: 'testwort-sliver' } },
            });
          }
          return HttpResponse.json({
            data: null,
            errors: [
              {
                message: 'Validation failed',
                extensions: {
                  code: 'VALIDATION',
                  fieldErrors: [{ path: ['endRedirect'], message: REDIRECT }],
                },
              },
            ],
          });
        }),
      );
      const onDone = renderForm({ formValue: FORM });

      type(name(), 'Testwort Sliver');
      press('Save Form');

      expect(await screen.findByRole('alert')).toHaveTextContent(REDIRECT);
      expect(screen.queryByRole('button', { name: 'Save Form' })).not.toBeInTheDocument();
      expect(onDone).not.toHaveBeenCalled();

      press('Rename Anyway');

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      const input = {
        name: 'Testwort Sliver',
        description: 'A form the test holds',
        groupId: GROUPS[1].id,
      };
      expect(calls).toEqual([
        { id: FORM.id, input },
        { id: FORM.id, input: { ...input, endRedirect: true } },
      ]);
    });

    it('says it is renaming, busy in the question, until the confirmed answer', async () => {
      let release = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      server.use(
        graphqlLink.mutation<
          UpdateIngredientFormValueMutation,
          UpdateIngredientFormValueMutationVariables
        >('UpdateIngredientFormValue', async ({ variables }) => {
          if (!variables.input.endRedirect) {
            return HttpResponse.json({
              data: null,
              errors: [
                {
                  message: 'Validation failed',
                  extensions: {
                    code: 'VALIDATION',
                    fieldErrors: [{ path: ['endRedirect'], message: REDIRECT }],
                  },
                },
              ],
            });
          }
          await held;
          return HttpResponse.json({
            data: { updateIngredientFormValue: { id: FORM.id, slug: 'testwort-sliver' } },
          });
        }),
      );
      const onDone = renderForm({ formValue: FORM });
      type(name(), 'Testwort Sliver');
      press('Save Form');
      await screen.findByRole('button', { name: 'Rename Anyway' });

      press('Rename Anyway');

      const busy = await screen.findByRole('button', { name: 'Renaming' });
      expect(busy).toBeDisabled();
      expect(busy).toHaveAttribute('aria-busy', 'true');
      expect(screen.queryByRole('button', { name: 'Save Form' })).not.toBeInTheDocument();
      release();
      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    });

    it('withdraws the question when the form is edited again', async () => {
      mockGraphQLError('UpdateIngredientFormValue', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['endRedirect'], message: REDIRECT }],
      });
      renderForm({ formValue: FORM });

      type(name(), 'Testwort Sliver');
      press('Save Form');
      await screen.findByRole('button', { name: 'Rename Anyway' });

      type(name(), 'Testwort Splinter');

      expect(screen.queryByRole('button', { name: 'Rename Anyway' })).not.toBeInTheDocument();
      expect(screen.queryByText(REDIRECT)).not.toBeInTheDocument();
      expect(save()).toBeEnabled();
    });

    it('withdraws the question on Keep Editing, sending nothing', async () => {
      mockGraphQLError('UpdateIngredientFormValue', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['endRedirect'], message: REDIRECT }],
      });
      const onDone = renderForm({ formValue: FORM });

      type(name(), 'Testwort Sliver');
      press('Save Form');
      await screen.findByRole('button', { name: 'Rename Anyway' });

      press('Keep Editing');

      expect(screen.queryByRole('button', { name: 'Rename Anyway' })).not.toBeInTheDocument();
      expect(save()).toBeEnabled();
      expect(onDone).not.toHaveBeenCalled();
    });
  });

  describe('deleting', () => {
    const CONFIRM =
      'Delete "Testwort Shard"? It can\'t be deleted while a compendium entry picks it. Covens\' ingredients keep what they wrote, which then counts as their own value rather than a curated one; nothing of theirs changes.';

    it('asks first, saying what it does, and deletes nothing on Keep It', () => {
      const onDone = renderForm({ formValue: FORM });

      press('Delete Form');

      expect(screen.getByText(CONFIRM)).toBeInTheDocument();
      press('Keep It');
      expect(screen.getByRole('button', { name: 'Delete Form' })).toBeInTheDocument();
      expect(onDone).not.toHaveBeenCalled();
    });

    it('deletes on confirmation, then is done', async () => {
      const calls: DeleteIngredientFormValueMutationVariables[] = [];
      mockGraphQLMutation<
        DeleteIngredientFormValueMutation,
        DeleteIngredientFormValueMutationVariables
      >('DeleteIngredientFormValue', (variables) => {
        calls.push(variables);
        return { deleteIngredientFormValue: FORM.id };
      });
      const onDone = renderForm({ formValue: FORM });

      press('Delete Form');
      press('Delete');

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      expect(calls).toEqual([{ id: FORM.id }]);
    });

    it('shows the refusal of a form a compendium entry picks, and stays open', async () => {
      const message =
        '"Testwort Shard" is the form of 1 compendium entry — Testwort. Change its form first.';
      mockGraphQLError('DeleteIngredientFormValue', { code: 'FORBIDDEN', message });
      const onDone = renderForm({ formValue: FORM });

      press('Delete Form');
      press('Delete');

      expect(await screen.findByRole('alert')).toHaveTextContent(message);
      expect(screen.getByRole('button', { name: 'Delete Form' })).toBeInTheDocument();
      expect(onDone).not.toHaveBeenCalled();
    });
  });
});
