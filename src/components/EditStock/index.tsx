'use client';

import { type ReactElement, useRef } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { formLabel } from '@/modules/ingredients/validation/form-label';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { placeServerIssues } from '../../lib/graphql-failure';
import { usePendingNavigation } from '../../lib/navigation';
import { FormActions } from '../Field';
import { PencilIcon } from '../IconTip';
import { DiscardQuestion, ModalButton, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import StockFields, { type StockFormValues, stockAmountsOf, stockFormValues } from '../StockFields';
import type { EditStockFormProps, EditStockProps } from './types';

// The Edit pencil on a jar line (M9.9): a `ModalButton` opening a dialog with
// the jar's three amounts, saved as `updateStock`. The service is the guard,
// the dialog says its refusal. Nothing on the page changes until the save has
// answered: no optimistic update, the page reads again once the dialog has
// closed. claude-docs/components/edit-stock.md.

const UpdateStockDocument = graphql(`
  mutation UpdateStock($workspaceId: ID!, $id: ID!, $input: StockInput!) {
    updateStock(workspaceId: $workspaceId, id: $id, input: $input) {
      id
    }
  }
`);

/** The input keys the form draws its own error under; each is also the field's name. */
const FIELDS: readonly (keyof StockFormValues)[] = ['quantityOnHand', 'unit', 'lowStockThreshold'];

const fieldOf = (key: unknown): keyof StockFormValues | undefined =>
  FIELDS.find((field) => field === key);

/**
 * The form inside the modal, so its guard over unsaved changes reaches the
 * modal's Close button, Escape and backdrop (claude-docs/components/modal.md,
 * "Unsaved changes").
 */
const EditStockForm = ({ workspaceId, jar, close }: EditStockFormProps): ReactElement => {
  const { refresh } = usePendingNavigation();
  const methods = useForm<StockFormValues>({ defaultValues: stockFormValues(jar) });
  const {
    handleSubmit,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = methods;
  const discard = useDiscardGuard(isDirty);
  const sent = useRef(false);

  async function send(values: StockFormValues): Promise<void> {
    try {
      await graphqlRequest(UpdateStockDocument, {
        workspaceId,
        id: jar.id,
        input: stockAmountsOf(values),
      });
    } catch (error) {
      // Beside the amount it names, or in the alert above the fields; what was typed stays.
      placeServerIssues(error, setError, ({ path: [key, ...rest] }) =>
        rest.length === 0 ? fieldOf(key) : undefined,
      );
      return;
    }
    // Once, however the button is pressed: the dialog fades out after `close`.
    if (sent.current) return;
    sent.current = true;
    close();
    refresh();
  }

  return (
    <FormProvider {...methods}>
      <form className="form" noValidate onSubmit={handleSubmit(send)}>
        {errors.root?.message && <Notice kind="error">{errors.root.message}</Notice>}
        <StockFields />
        <FormActions
          noun="Stock"
          dirty={isDirty}
          submitting={isSubmitting}
          onCancel={() => discard.request(close)}
        />
        {/* Over the form, its buttons beneath. */}
        {discard.asking && <DiscardQuestion guard={discard} />}
      </form>
    </FormProvider>
  );
};

const EditStock = ({ workspaceId, jar }: EditStockProps): ReactElement => (
  <ModalButton
    tip="Edit Stock"
    label={<PencilIcon />}
    ariaLabel={`Edit Stock, ${jar.ingredient}, ${formLabel(jar.form)}`}
    className="icon-tip__edit icon-tip__edit--plain"
    eyebrow="Edit Stock"
    title={jar.ingredient}
    qualifier={formLabel(jar.form)}
  >
    {(close) => <EditStockForm workspaceId={workspaceId} jar={jar} close={close} />}
  </ModalButton>
);

export default EditStock;
