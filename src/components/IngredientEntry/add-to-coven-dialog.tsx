'use client';

import { useMutation } from '@tanstack/react-query';
import { type ReactElement, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import { SelectField } from '../Field';
import { AddCupboardEntryDocument } from './add-cupboard-entry';
import Modal from '../Modal';
import Notice from '../Notice';
import type { AddToCovenDialogProps } from './types';

// The question Add to Cupboard asks inside the public entry page's Edit menu, where two or more
// of the viewer's covens may add (M9.12): which one. Standing alone, Add to Cupboard is a menu of
// the covens instead, as the compendium card's plus is (the owner's call, 2026-10-20); inside a
// menu it cannot hold a second one, so it asks here. A confirm modal with the covens in a dropdown, the shared
// SelectField (the owner's call, 2026-10-20, over the radio group it first had). A coven that
// already holds the entry is listed, so the viewer sees where it is, and cannot be chosen. It
// starts on the coven Add Ingredient would choose, or the first that can still be chosen where
// that one holds the entry. A refusal is said in the modal, which stays open; a success closes
// it and hands the page's re-read back to the menu. claude-docs/components/ingredient-entry.md.

const TITLE = 'Add to Cupboard';

const AddToCovenDialog = ({
  ingredientId,
  covens,
  heldIn,
  workspaceId,
  onClose,
  onAdded,
}: AddToCovenDialogProps): ReactElement => {
  const choosable = covens.filter(({ id }) => !heldIn.includes(id));
  // A form only because SelectField is react-hook-form's; nothing is submitted through it.
  const methods = useForm<{ coven: string }>({
    defaultValues: {
      coven: (choosable.find(({ id }) => id === workspaceId) ?? choosable[0])?.id ?? '',
    },
  });
  const chosen = methods.watch('coven');
  const [failure, setFailure] = useState<string>();
  const add = useMutation({
    mutationFn: (to: string) =>
      graphqlRequest(AddCupboardEntryDocument, { workspaceId: to, ingredientId }),
  });

  return (
    <Modal title={TITLE} onClose={onClose}>
      {(close) => (
        <FormProvider {...methods}>
          {/* The `form` class's stack, as the Invite dialog spaces its one field: a clear gap round the
              field, and the buttons a step further off (the owner's call, 2026-10-20). */}
          <div className="form">
            <SelectField<{ coven: string }>
              name="coven"
              label="Coven"
              placeholder="Choose a Coven"
              options={covens.map(({ id, name }) => {
                const held = heldIn.includes(id);
                return {
                  value: id,
                  label: name,
                  note: held ? 'Already in My Ingredients' : undefined,
                  disabled: held,
                };
              })}
            />
            {/* In the dialog, where the viewer is looking, and not under the menu behind it. */}
            {failure && <Notice kind="error">{failure}</Notice>}
            <div className="modal__actions">
              <BusyButton
                className="btn btn--solid"
                disabled={chosen === '' || add.isPending}
                busy={add.isPending}
                busyLabel="Adding"
                onClick={() => {
                  setFailure(undefined);
                  add.mutate(chosen, {
                    onSuccess: () => {
                      close();
                      onAdded();
                    },
                    // No fields of its own, so the reader always answers with an alert.
                    onError: (error) => setFailure(readGraphqlFailure(error).alert),
                  });
                }}
              >
                Add
              </BusyButton>
              <button
                className="btn btn--quiet"
                type="button"
                disabled={add.isPending}
                onClick={close}
              >
                Cancel
              </button>
            </div>
          </div>
        </FormProvider>
      )}
    </Modal>
  );
};

export default AddToCovenDialog;
