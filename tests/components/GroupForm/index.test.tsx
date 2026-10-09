import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GroupForm from '@/components/GroupForm';
import type { GroupFormProps } from '@/components/GroupForm/types';
import type {
  CreateCategoryGroupMutation,
  CreateCategoryGroupMutationVariables,
  CreateDeityTraditionMutation,
  CreateDeityTraditionMutationVariables,
  CreateIngredientFormGroupMutation,
  CreateIngredientFormGroupMutationVariables,
  DeleteCategoryGroupMutation,
  DeleteCategoryGroupMutationVariables,
  DeleteDeityTraditionMutation,
  DeleteDeityTraditionMutationVariables,
  DeleteIngredientFormGroupMutation,
  DeleteIngredientFormGroupMutationVariables,
  UpdateCategoryGroupMutation,
  UpdateCategoryGroupMutationVariables,
} from '@/gql/graphql';
import { makeQueryClient } from '@/lib/graphql-client';
import { pairedColor } from '@/lib/group-colors';
import { mockGraphQLError, mockGraphQLMutation } from '../../support/msw/graphql';

// The admin's form for a group (M5.6b), for every group vocabulary, a deity's
// traditions included (MB.132): a name, a
// description, and for a category group its chip's two colours, each held to
// 4.5:1 on its own ground (MB.36) before the request as well as by the
// service. A delete of a group holding rows first asks where they go, then
// asks to confirm that move (claude-docs/components/group-form.md).

const GROUPS = [
  { id: '0b9f0f6e-2f4c-4d7a-9a52-3c1c5b8e6d21', name: 'Fixture Mineral' },
  { id: '1c8e1e5d-3e5b-4c6a-8b41-2d0b4a7d5c10', name: 'Fixture Substance' },
  { id: '5a0e3c2b-7d6f-4e1a-9b8c-0f1e2d3c4b5a', name: 'Fixture Wards' },
];

const WARDS = {
  id: GROUPS[2].id,
  name: 'Fixture Wards',
  description: 'A group the test holds',
  colorDark: '#4e8bc2',
  colorLight: '#0c5393',
};

const MATTER = { ...WARDS, name: 'Fixture Matter', colorDark: '', colorLight: '' };

function renderForm(props: Partial<GroupFormProps> = {}) {
  const onDone = vi.fn();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <GroupForm kind="category" groups={GROUPS} onDone={onDone} {...props} />
    </QueryClientProvider>,
  );
  return onDone;
}

const name = () => screen.getByRole('textbox', { name: 'Name' });
const description = () => screen.getByRole('textbox', { name: 'Description' });
const dark = () => screen.getByRole('textbox', { name: 'Dark Theme Colour' });
const light = () => screen.getByRole('textbox', { name: 'Light Theme Colour' });
const type = (field: HTMLElement, value: string) => fireEvent.change(field, { target: { value } });
const press = (label: string) => {
  const button = screen.getByRole('button', { name: label });
  button.focus();
  fireEvent.click(button);
};
const choose = (box: string, label: string) => {
  fireEvent.click(screen.getByRole('combobox', { name: box }));
  fireEvent.click(
    within(screen.getByRole('listbox', { name: `${box} choices` })).getByRole('option', {
      name: label,
    }),
  );
};

describe('GroupForm, for a category group', () => {
  describe('adding', () => {
    it('starts empty, with both colours and nothing to delete', () => {
      renderForm();

      expect(name()).toHaveValue('');
      expect(dark()).toHaveValue('');
      expect(light()).toHaveValue('');
      expect(screen.queryByRole('button', { name: 'Delete Group' })).not.toBeInTheDocument();
    });

    // A field named "name" reads to Chrome as a person's name: it flags it in
    // the Issues panel and offers the user's own name to fill it.
    it('turns autofill off on the name, which names no person', () => {
      renderForm();

      expect(name()).toHaveAttribute('autocomplete', 'off');
    });

    it('marks every field required, and keeps Save off until something is entered', () => {
      renderForm();

      for (const field of [name(), description(), dark(), light()]) {
        expect(field).toHaveAttribute('aria-required', 'true');
      }
      expect(screen.getByRole('button', { name: 'Save Group' })).toBeDisabled();
      type(name(), 'F');
      expect(screen.getByRole('button', { name: 'Save Group' })).toBeEnabled();
    });

    it('creates the group from what was entered, its colours lower-cased, then is done', async () => {
      const calls: CreateCategoryGroupMutationVariables[] = [];
      mockGraphQLMutation<CreateCategoryGroupMutation, CreateCategoryGroupMutationVariables>(
        'CreateCategoryGroup',
        (variables) => {
          calls.push(variables);
          return { createCategoryGroup: { id: WARDS.id, slug: 'fixture-wards' } };
        },
      );
      const onDone = renderForm();

      type(name(), 'Fixture Wards');
      type(description(), 'A group the test made');
      type(dark(), '#4E8BC2');
      type(light(), '#0c5393');
      press('Save Group');

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      expect(calls).toEqual([
        {
          input: {
            name: 'Fixture Wards',
            description: 'A group the test made',
            colorDark: '#4e8bc2',
            colorLight: '#0c5393',
          },
        },
      ]);
    });

    // The schema is the service's, so the floor holds before the request.
    it('refuses a colour under the floor beside its own picker, naming the ratio, before asking the server', async () => {
      const onDone = renderForm();

      type(name(), 'Fixture Wards');
      type(description(), 'Invented');
      type(dark(), '#0c5393');
      type(light(), '#0c5393');
      press('Save Group');

      const message =
        'The dark theme colour reads 2.16:1 on the dark card — it needs at least 4.5:1';
      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(dark()).toHaveAccessibleDescription(expect.stringContaining(message));
      expect(dark()).toHaveAttribute('aria-invalid', 'true');
      expect(light()).not.toHaveAttribute('aria-invalid');
      expect(onDone).not.toHaveBeenCalled();
    });
  });

  // The owner's call: the colour chosen first sets its partner, the same hue
  // fitted to the other ground, until the admin sets the partner themselves.
  describe('the pair', () => {
    it('fills the light-theme colour from a dark-theme one chosen first', () => {
      renderForm();

      type(dark(), '#4e8bc2');

      expect(light()).toHaveValue(pairedColor('#4e8bc2', 'colorLight'));
    });

    it('fills the dark-theme colour from a light-theme one chosen first', () => {
      renderForm();

      type(light(), '#0c5393');

      expect(dark()).toHaveValue(pairedColor('#0c5393', 'colorDark'));
    });

    it('waits for a whole hex before filling anything', () => {
      renderForm();

      type(dark(), '#4e8bc');

      expect(light()).toHaveValue('');
    });

    // A picker dragged across the wheel sends a value at every step.
    it('keeps the partner following while it is still the one it filled', () => {
      renderForm();

      type(dark(), '#4e8bc2');
      type(dark(), '#35987d');

      expect(light()).toHaveValue(pairedColor('#35987d', 'colorLight'));
    });

    it('stops once the admin sets the partner themselves', () => {
      renderForm();

      type(dark(), '#4e8bc2');
      type(light(), '#0c5393');
      type(dark(), '#4a87bf');

      expect(light()).toHaveValue('#0c5393');
    });

    it('sets a colour from the other on Match, as the other stands now', () => {
      renderForm({ group: WARDS });

      type(light(), '#a13ba5');
      fireEvent.click(screen.getByRole('button', { name: 'Match Light Theme Colour' }));

      expect(dark()).toHaveValue(pairedColor('#a13ba5', 'colorDark'));
      expect(light()).toHaveValue('#a13ba5');
    });

    it("leaves an existing group's pair alone", () => {
      renderForm({ group: WARDS });

      type(dark(), '#4a87bf');

      expect(light()).toHaveValue(WARDS.colorLight);
    });
  });

  // The owner's call: a colour too close to another group's in the same
  // theme is warned of, beside its picker, and never blocks the save.
  describe('the near-colour warning', () => {
    const COLOURED = [
      { ...GROUPS[0], colorDark: '#5a87ae', colorLight: '#286ba6' },
      { ...GROUPS[1], colorDark: '#c371c6', colorLight: '#a13ba5' },
      { ...GROUPS[2], colorDark: '#5d8ab1', colorLight: '#286ba6' },
    ];

    it("warns of another group's colour in the same theme, naming it", () => {
      renderForm({ groups: COLOURED });

      type(dark(), '#5a87ae');

      expect(screen.getAllByRole('status')[0]).toHaveTextContent(
        'Close to the dark theme colour of "Fixture Mineral", so their chips may be hard to tell apart.',
      );
    });

    it('never warns an edited group of its own colours', () => {
      renderForm({ group: WARDS, groups: [COLOURED[2]] });

      type(dark(), '#5d8ab2');

      for (const status of screen.getAllByRole('status')) expect(status).toBeEmptyDOMElement();
    });

    it('leaves Save enabled', () => {
      renderForm({ groups: COLOURED });

      type(name(), 'Fixture Near');
      type(dark(), '#5d8ab1');

      expect(screen.getByRole('button', { name: 'Save Group' })).toBeEnabled();
    });
  });

  describe('editing', () => {
    it('starts from the group, and sends it whole with its id', async () => {
      const calls: UpdateCategoryGroupMutationVariables[] = [];
      mockGraphQLMutation<UpdateCategoryGroupMutation, UpdateCategoryGroupMutationVariables>(
        'UpdateCategoryGroup',
        (variables) => {
          calls.push(variables);
          return { updateCategoryGroup: { id: WARDS.id, slug: 'fixture-shields' } };
        },
      );
      const onDone = renderForm({ group: WARDS });

      expect(name()).toHaveValue('Fixture Wards');
      expect(dark()).toHaveValue('#4e8bc2');
      type(name(), 'Fixture Shields');
      press('Save Group');

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      expect(calls).toEqual([
        {
          id: WARDS.id,
          input: {
            name: 'Fixture Shields',
            description: 'A group the test holds',
            colorDark: '#4e8bc2',
            colorLight: '#0c5393',
          },
        },
      ]);
    });

    it("lands the server's refusal beside the field it names", async () => {
      const message =
        '"Fixture Shields" already has the address "fixture-shields" — choose another name';
      mockGraphQLError('UpdateCategoryGroup', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['name'], message }],
      });
      renderForm({ group: WARDS });

      type(name(), 'Fixture Shields');
      press('Save Group');

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(name()).toHaveAccessibleDescription(message);
    });
  });

  describe('deleting one that holds categories', () => {
    it('asks where they go first, offering every other group and not itself', () => {
      renderForm({ group: WARDS, memberCount: 3 });

      press('Delete Group');
      fireEvent.click(screen.getByRole('combobox', { name: 'Move its 3 categories to' }));

      const options = within(
        screen.getByRole('listbox', { name: 'Move its 3 categories to choices' }),
      ).getAllByRole('option');
      expect(options.map((option) => option.textContent)).toEqual([
        'Fixture Mineral',
        'Fixture Substance',
      ]);
      expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    });

    it('asks to confirm the move once a group is chosen, and moves them on confirmation', async () => {
      const calls: DeleteCategoryGroupMutationVariables[] = [];
      mockGraphQLMutation<DeleteCategoryGroupMutation, DeleteCategoryGroupMutationVariables>(
        'DeleteCategoryGroup',
        (variables) => {
          calls.push(variables);
          return { deleteCategoryGroup: WARDS.id };
        },
      );
      const onDone = renderForm({ group: WARDS, memberCount: 3 });

      press('Delete Group');
      choose('Move its 3 categories to', 'Fixture Mineral');
      press('Continue');

      expect(
        screen.getByText(
          'Move 3 categories to "Fixture Mineral" and delete "Fixture Wards"? Each keeps its name, its address and every entry filed under it.',
        ),
      ).toBeInTheDocument();
      expect(calls).toEqual([]);
      press('Move and Delete');

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      expect(calls).toEqual([{ id: WARDS.id, moveTo: GROUPS[0].id }]);
    });

    it('goes back to the choice from the confirmation, and back to the form on Keep It', () => {
      const onDone = renderForm({ group: WARDS, memberCount: 1 });

      press('Delete Group');
      choose('Move its 1 category to', 'Fixture Substance');
      press('Continue');
      press('Back');
      expect(screen.getByRole('combobox', { name: 'Move its 1 category to' })).toHaveTextContent(
        'Fixture Substance',
      );
      press('Keep It');

      expect(screen.getByRole('button', { name: 'Delete Group' })).toBeInTheDocument();
      expect(onDone).not.toHaveBeenCalled();
    });

    it('says to add another group first when there is none to move them to', () => {
      renderForm({ group: WARDS, memberCount: 2, groups: [GROUPS[2]] });

      press('Delete Group');

      expect(
        screen.getByText(
          '"Fixture Wards" holds 2 categories, and there is no other group to move them to. Add another group first.',
        ),
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Continue' })).not.toBeInTheDocument();
    });

    it("lands the server's refusal of the move beside the picker", async () => {
      const message = 'Choose another live group to move its 1 category to';
      mockGraphQLError('DeleteCategoryGroup', {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['moveTo'], message }],
      });
      renderForm({ group: WARDS, memberCount: 1 });

      press('Delete Group');
      choose('Move its 1 category to', 'Fixture Mineral');
      press('Continue');
      press('Move and Delete');

      expect(await screen.findByText(message)).toBeInTheDocument();
      expect(
        screen.getByRole('combobox', { name: 'Move its 1 category to' }),
      ).toHaveAccessibleDescription(message);
    });
  });

  describe('deleting one that holds nothing', () => {
    it('asks plainly, and deletes without a destination', async () => {
      const calls: DeleteCategoryGroupMutationVariables[] = [];
      mockGraphQLMutation<DeleteCategoryGroupMutation, DeleteCategoryGroupMutationVariables>(
        'DeleteCategoryGroup',
        (variables) => {
          calls.push(variables);
          return { deleteCategoryGroup: WARDS.id };
        },
      );
      const onDone = renderForm({ group: WARDS, memberCount: 0 });

      press('Delete Group');
      expect(
        screen.getByText('Delete "Fixture Wards"? No category is filed under it.'),
      ).toBeInTheDocument();
      press('Delete');

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      expect(calls).toEqual([{ id: WARDS.id }]);
    });

    it('shows any other refusal above the fields, and stays open', async () => {
      mockGraphQLError('DeleteCategoryGroup', { code: 'NOT_FOUND', message: 'No such group' });
      const onDone = renderForm({ group: WARDS, memberCount: 0 });

      press('Delete Group');
      press('Delete');

      expect(await screen.findByRole('alert')).toHaveTextContent('No such group');
      expect(onDone).not.toHaveBeenCalled();
    });
  });
});

describe('GroupForm, for a form group', () => {
  it('asks for no colours, and creates the group from its name and description alone', async () => {
    const calls: CreateIngredientFormGroupMutationVariables[] = [];
    mockGraphQLMutation<
      CreateIngredientFormGroupMutation,
      CreateIngredientFormGroupMutationVariables
    >('CreateIngredientFormGroup', (variables) => {
      calls.push(variables);
      return { createIngredientFormGroup: { id: MATTER.id, slug: 'fixture-matter' } };
    });
    const onDone = renderForm({ kind: 'form' });

    expect(screen.queryByRole('textbox', { name: 'Dark Theme Colour' })).not.toBeInTheDocument();
    type(name(), 'Fixture Matter');
    type(description(), 'A group the test made');
    press('Save Group');

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([
      { input: { name: 'Fixture Matter', description: 'A group the test made' } },
    ]);
  });

  it('moves its forms on a confirmed delete, saying their addresses follow the group', async () => {
    const calls: DeleteIngredientFormGroupMutationVariables[] = [];
    mockGraphQLMutation<
      DeleteIngredientFormGroupMutation,
      DeleteIngredientFormGroupMutationVariables
    >('DeleteIngredientFormGroup', (variables) => {
      calls.push(variables);
      return { deleteIngredientFormGroup: MATTER.id };
    });
    const onDone = renderForm({ kind: 'form', group: MATTER, memberCount: 2 });

    press('Delete Group');
    choose('Move its 2 forms to', 'Fixture Substance');
    press('Continue');

    expect(
      screen.getByText(
        'Move 2 forms to "Fixture Substance" and delete "Fixture Matter"? Each keeps its name, and its address follows its new group; every ingredient that picked one keeps it.',
      ),
    ).toBeInTheDocument();
    press('Move and Delete');

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ id: MATTER.id, moveTo: GROUPS[1].id }]);
  });
});

// MB.132: a deity's tradition, a form group's shape under its own name, its
// deities moved and re-slugged on a delete.
describe('GroupForm, for a deity tradition', () => {
  it('asks for no colours, and creates the tradition from its name and description alone', async () => {
    const calls: CreateDeityTraditionMutationVariables[] = [];
    mockGraphQLMutation<CreateDeityTraditionMutation, CreateDeityTraditionMutationVariables>(
      'CreateDeityTradition',
      (variables) => {
        calls.push(variables);
        return { createDeityTradition: { id: MATTER.id, slug: 'fixtural' } };
      },
    );
    const onDone = renderForm({ kind: 'tradition' });

    expect(screen.queryByRole('textbox', { name: 'Dark Theme Colour' })).not.toBeInTheDocument();
    type(name(), 'Fixtural');
    type(description(), 'A tradition the test made');
    press('Save Tradition');

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([
      { input: { name: 'Fixtural', description: 'A tradition the test made' } },
    ]);
  });

  it('moves its deities on a confirmed delete, saying their addresses follow the tradition', async () => {
    const calls: DeleteDeityTraditionMutationVariables[] = [];
    mockGraphQLMutation<DeleteDeityTraditionMutation, DeleteDeityTraditionMutationVariables>(
      'DeleteDeityTradition',
      (variables) => {
        calls.push(variables);
        return { deleteDeityTradition: MATTER.id };
      },
    );
    const onDone = renderForm({ kind: 'tradition', group: MATTER, memberCount: 1 });

    press('Delete Tradition');
    expect(screen.getByRole('combobox', { name: 'Move its 1 deity to' })).toHaveTextContent(
      'Choose a tradition',
    );
    choose('Move its 1 deity to', 'Fixture Substance');
    press('Continue');

    expect(
      screen.getByText(
        'Move 1 deity to "Fixture Substance" and delete "Fixture Matter"? Each keeps its name, and its address follows its new tradition; every ingredient that picked one keeps it.',
      ),
    ).toBeInTheDocument();
    press('Move and Delete');

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(calls).toEqual([{ id: MATTER.id, moveTo: GROUPS[1].id }]);
  });

  it('says to add another tradition first when there is none to move its deities to', () => {
    renderForm({ kind: 'tradition', group: MATTER, groups: [GROUPS[2]], memberCount: 2 });

    press('Delete Tradition');

    expect(
      screen.getByText(
        '"Fixture Matter" holds 2 deities, and there is no other tradition to move them to. Add another tradition first.',
      ),
    ).toBeInTheDocument();
  });
});
