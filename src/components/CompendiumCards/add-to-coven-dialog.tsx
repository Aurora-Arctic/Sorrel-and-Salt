'use client';

import { useMutation } from '@tanstack/react-query';
import { type ReactElement, useId, useState } from 'react';
import { graphqlRequest } from '../../lib/graphql-client';
import { readGraphqlFailure } from '../../lib/graphql-failure';
import BusyButton from '../BusyButton';
import { RadioGroupField } from '../Field';
import { AddCupboardEntryDocument } from '../IngredientEntry/add-cupboard-entry';
import Modal from '../Modal';
import Notice from '../Notice';
import type { AddToCovenDialogProps } from './types';

// The question the plus asks of someone who may write in several covens (M9.12, the owner's
// call, 2026-10-20): which one. A confirm modal with the covens as a radio group. A coven that
// already holds the entry is listed, so the viewer sees where it is, and cannot be chosen. It
// starts on the coven Add Ingredient would choose, or the first that can still be chosen where
// that one holds the entry. A refusal is said in the modal, which stays open; a success closes
// it and hands the page's re-read back to the plus. claude-docs/components/compendium-cards.md.

const TITLE = 'Add to My Ingredients';

const AddToCovenDialog = ({
  ingredientId,
  covens,
  heldIn,
  workspaceId,
  onClose,
  onAdded,
}: AddToCovenDialogProps): ReactElement => {
  const group = useId();
  const choosable = covens.filter(({ id }) => !heldIn.includes(id));
  const [chosen, setChosen] = useState<string>(
    () => (choosable.find(({ id }) => id === workspaceId) ?? choosable[0])?.id ?? '',
  );
  const [failure, setFailure] = useState<string>();
  const add = useMutation({
    mutationFn: (to: string) =>
      graphqlRequest(AddCupboardEntryDocument, { workspaceId: to, ingredientId }),
  });

  return (
    <Modal title={TITLE} onClose={onClose}>
      {(close) => (
        <>
          <RadioGroupField
            legend="Coven"
            name={group}
            value={chosen}
            onChange={setChosen}
            disabled={add.isPending}
            options={covens.map(({ id, name }) => {
              const held = heldIn.includes(id);
              return {
                value: id,
                label: name,
                description: held ? 'Already in My Ingredients' : undefined,
                disabled: held,
              };
            })}
          />
          {/* In the dialog, where the viewer is looking, and not under the plus behind it. */}
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
        </>
      )}
    </Modal>
  );
};

export default AddToCovenDialog;
