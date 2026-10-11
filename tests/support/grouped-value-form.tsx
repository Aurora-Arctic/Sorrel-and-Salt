import { QueryClientProvider } from '@tanstack/react-query';
import { HttpResponse } from 'msw';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { expect, vi } from 'vitest';
import GroupedValueForm from '@/components/GroupedValueForm';
import { makeQueryClient } from '@/lib/graphql-client';
import { graphqlLink, mockGraphQLError, mockGraphQLMutation } from './msw/graphql';
import { server } from './msw/server';
import type { GroupedValueFormCase, GroupedValueFormSubject } from './types';

// GroupedValueForm is one form for every grouped vocabulary: a name, a
// description and a group, saved through the kind's create, update and
// delete mutations. The behaviour every kind shares is written once, here, as
// rows tests/components/GroupedValueForm runs with `it.each` on one subject
// (MB.189, MB.132): a kind shares this code path, so another kind's run would
// prove nothing more, and gets only what it changes in its own describe — its
// mutations, the rename note, the redirect question, its own refusals. The
// group field is found by the subject's own label, since a kind may call its
// group something else.

const name = () => screen.getByRole('textbox', { name: 'Name' });
const description = () => screen.getByRole('textbox', { name: 'Description' });
const button = (label: string) => screen.getByRole('button', { name: label });
const type = (field: HTMLElement, value: string) => fireEvent.change(field, { target: { value } });
const press = (label: string) => {
  button(label).focus();
  fireEvent.click(button(label));
};
const group = (subject: GroupedValueFormSubject) =>
  screen.getByRole('combobox', { name: subject.groupLabel });
const chooseGroup = (subject: GroupedValueFormSubject, label: string) => {
  fireEvent.click(group(subject));
  fireEvent.click(
    within(screen.getByRole('listbox', { name: `${subject.groupLabel} choices` })).getByRole(
      'option',
      { name: label },
    ),
  );
};

function renderSubject(subject: GroupedValueFormSubject, editing = false) {
  const onDone = vi.fn();
  render(
    <QueryClientProvider client={makeQueryClient()}>
      <GroupedValueForm
        kind={subject.kind}
        value={editing ? subject.value : undefined}
        groups={subject.groups}
        onDone={onDone}
      />
    </QueryClientProvider>,
  );
  return onDone;
}

export const ADDING: GroupedValueFormCase[] = [
  // The owner's rule for every form: Save is offered only when there is
  // something to save.
  [
    'keeps Save off until something is entered',
    (subject) => {
      renderSubject(subject);
      const save = () => button(`Save ${subject.noun}`);

      expect(save()).toBeDisabled();
      type(name(), 'T');
      expect(save()).toBeEnabled();
      type(name(), '');
      expect(save()).toBeDisabled();
    },
  ],
  [
    'refuses a blank description and group before asking the server',
    async (subject) => {
      const onDone = renderSubject(subject);

      type(name(), subject.value.name);
      press(`Save ${subject.noun}`);

      await waitFor(() => expect(description()).toHaveAttribute('aria-invalid', 'true'));
      expect(description()).toHaveAccessibleDescription(/\S/);
      expect(group(subject)).toHaveAttribute('aria-invalid', 'true');
      expect(group(subject)).toHaveAccessibleDescription(/\S/);
      expect(onDone).not.toHaveBeenCalled();
    },
  ],
  [
    'is busy and held down until the answer',
    async (subject) => {
      let release = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      server.use(
        graphqlLink.mutation(subject.create.operation, async () => {
          await held;
          return HttpResponse.json({ data: subject.create.data });
        }),
      );
      const onDone = renderSubject(subject);
      type(name(), subject.value.name);
      type(description(), 'Held');
      chooseGroup(subject, subject.groups[0].name);
      const busy = button(`Save ${subject.noun}`);
      press(`Save ${subject.noun}`);

      await waitFor(() => expect(busy).toHaveAttribute('aria-busy', 'true'));
      expect(busy).toBeDisabled();
      release();
      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    },
  ],
  // The owner's call (MB.115): the group is typed into, the list narrowing
  // as it is, and only a listed group is ever the value.
  [
    'takes its group by typing, the list narrowing to the groups holding the text',
    async (subject) => {
      const calls: { input: object }[] = [];
      mockGraphQLMutation(subject.create.operation, (variables: { input: object }) => {
        calls.push(variables);
        return subject.create.data;
      });
      const onDone = renderSubject(subject);
      const [, chosen] = subject.groups;

      type(name(), subject.value.name);
      type(description(), 'Typed');
      type(group(subject), chosen.name.slice(-4).toUpperCase());
      const list = screen.getByRole('listbox', { name: `${subject.groupLabel} choices` });
      expect(within(list).getAllByRole('option')).toHaveLength(1);
      fireEvent.keyDown(group(subject), { key: 'Enter' });
      expect(group(subject)).toHaveValue(chosen.name);
      press(`Save ${subject.noun}`);

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      // Under the kind's own key for its group, `groupId` or `traditionId`.
      expect(Object.values(calls[0]?.input ?? {})).toContain(chosen.id);
    },
  ],
  [
    "lands the server's slug refusal beside Name",
    async (subject) => {
      mockGraphQLError(subject.create.operation, {
        code: 'VALIDATION',
        fieldErrors: [{ path: ['name'], message: subject.slugClash.message }],
      });
      const onDone = renderSubject(subject);

      type(name(), subject.slugClash.name);
      type(description(), 'A clash');
      chooseGroup(subject, subject.groups[0].name);
      press(`Save ${subject.noun}`);

      await waitFor(() => expect(name()).toHaveAttribute('aria-invalid', 'true'));
      expect(name()).toHaveAccessibleDescription(/\S/);
      expect(onDone).not.toHaveBeenCalled();
    },
  ],
];

export const EDITING: GroupedValueFormCase[] = [
  [
    'keeps Save off until something changes, and off again once it is put back',
    (subject) => {
      renderSubject(subject, true);
      const save = () => button(`Save ${subject.noun}`);

      expect(save()).toBeDisabled();
      chooseGroup(subject, subject.groups[0].name);
      expect(save()).toBeEnabled();
      chooseGroup(subject, subject.groups[1].name);
      expect(save()).toBeDisabled();
    },
  ],
  [
    'holds no group while the text names none, and refuses it on Save',
    async (subject) => {
      // No answer is set up: the form refuses it before asking the server.
      const onDone = renderSubject(subject, true);

      expect(group(subject)).not.toHaveAttribute('aria-invalid');
      type(group(subject), subject.groups[1].name.slice(0, -1));
      press(`Save ${subject.noun}`);

      await waitFor(() => expect(group(subject)).toHaveAttribute('aria-invalid', 'true'));
      expect(group(subject)).toHaveAccessibleDescription(/\S/);
      expect(onDone).not.toHaveBeenCalled();
    },
  ],
  [
    'is done without saving on Cancel',
    (subject) => {
      const onDone = renderSubject(subject, true);

      press('Cancel');

      expect(onDone).toHaveBeenCalledTimes(1);
    },
  ],
];

export const DELETING: GroupedValueFormCase[] = [
  [
    'deletes on confirmation, then is done',
    async (subject) => {
      const calls: unknown[] = [];
      mockGraphQLMutation(subject.remove.operation, (variables) => {
        calls.push(variables);
        return subject.remove.data;
      });
      const onDone = renderSubject(subject, true);

      press(`Delete ${subject.noun}`);
      press('Delete');

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      expect(calls).toEqual([{ id: subject.value.id }]);
    },
  ],
];
