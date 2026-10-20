'use client';

import { type ReactElement, useId, useRef } from 'react';
import { FormProvider, useFieldArray, useForm, useFormContext, useWatch } from 'react-hook-form';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { placeServerIssues } from '../../lib/graphql-failure';
import { usePendingNavigation } from '../../lib/navigation';
import { ComboboxSelect } from '../Combobox';
import { FieldError, FormActions } from '../Field';
import { BinButton, PencilIcon } from '../IconTip';
import { DiscardQuestion, ModalButton, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import StockFields, { EMPTY_STOCK } from '../StockFields';
import { openingRows, rowFieldOf, stockBatch } from './batch';
import type {
  StockDialogFormProps,
  StockDialogProps,
  StockDialogValues,
  StockForm,
  StockRow,
} from './types';
import './index.scss';

// The pencil on a coven card (M9.9): a `ModalButton` opening a dialog with a
// row per jar the coven holds of the ingredient, a form added from Add Form,
// and a jar's Remove staged until Save, all sent as one `saveStock`. The
// service is the guard, the dialog says its refusal. Nothing on the page
// changes until the save has answered: the page reads again once the dialog
// has closed.

const SaveStockDocument = graphql(`
  mutation SaveStock($workspaceId: ID!, $ingredientId: ID!, $input: SaveStockInput!) {
    saveStock(workspaceId: $workspaceId, ingredientId: $ingredientId, input: $input) {
      id
    }
  }
`);

interface RowProps {
  index: number;
  label: string;
  onRemove: () => void;
  onUndo: () => void;
}

/**
 * One jar: its form as the row's name, its three amounts compact on one line,
 * and Remove beside its name. Staged for removal, the form is struck through and its amounts
 * put away, kept as typed, until Undo.
 */
function Row({ index, label, onRemove, onUndo }: RowProps): ReactElement {
  const id = useId();
  const {
    control,
    formState: { errors },
  } = useFormContext<StockDialogValues>();
  const removed = useWatch({ control, name: `rows.${index}.removed` });
  const error = errors.rows?.[index]?.variantId?.message;
  return (
    <fieldset
      className={removed ? 'stock-dialog__row is-removed' : 'stock-dialog__row'}
      aria-describedby={error ? `${id}-error` : undefined}
    >
      <legend className="stock-dialog__form">{removed ? <s>{label}</s> : label}</legend>
      {removed ? (
        <button
          type="button"
          className="btn btn--small stock-dialog__undo"
          aria-label={`Undo Remove ${label}`}
          onClick={onUndo}
        >
          Undo
        </button>
      ) : (
        <>
          <StockFields<StockDialogValues> prefix={`rows.${index}`} form={label} size="compact" />
          <BinButton verb="Remove" name={label} onClick={onRemove} />
        </>
      )}
      <FieldError id={`${id}-error`} message={error} />
    </fieldset>
  );
}

/** The forms held by no row yet, a staged removal still holding its own. */
const unheld = (forms: readonly StockForm[], rows: readonly StockRow[]): StockForm[] =>
  forms.filter((form) => !rows.some((row) => row.variantId === form.variantId));

/**
 * The form inside the modal, so its guard over unsaved changes reaches the
 * modal's Close button, Escape and backdrop (claude-docs/components/modal.md,
 * "Unsaved changes").
 */
const StockDialogForm = ({
  workspaceId,
  ingredientId,
  forms,
  jars,
  close,
}: StockDialogFormProps): ReactElement => {
  const { refresh } = usePendingNavigation();
  const addId = useId();
  const methods = useForm<StockDialogValues>({ defaultValues: { rows: openingRows(jars) } });
  const {
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: 'rows', keyName: 'key' });
  const rows = useWatch({ control, name: 'rows' }) ?? [];
  const discard = useDiscardGuard(isDirty);
  const sent = useRef(false);
  const labelOf = (variantId: string) =>
    forms.find((form) => form.variantId === variantId)?.label ?? '';
  const addable = unheld(forms, rows);

  async function send({ rows: values }: StockDialogValues): Promise<void> {
    const { input, from } = stockBatch(values, jars);
    try {
      await graphqlRequest(SaveStockDocument, { workspaceId, ingredientId, input });
    } catch (error) {
      // Beside the amount, or on the row, it names, every row's at once; the
      // rest in the alert above. What was typed and staged stays.
      placeServerIssues(error, setError, ({ path }) => rowFieldOf(path, from));
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
        {fields.map((field, index) => (
          <Row
            key={field.key}
            index={index}
            label={labelOf(field.variantId)}
            // A jar held is staged, to be sent as a delete; a row added here
            // was never sent, so it simply goes.
            onRemove={() =>
              field.jarId === null
                ? remove(index)
                : setValue(`rows.${index}.removed`, true, { shouldDirty: true })
            }
            onUndo={() => setValue(`rows.${index}.removed`, false, { shouldDirty: true })}
          />
        ))}
        {/* Gone once every form has a row: there is nothing left to add. */}
        {addable.length > 0 && (
          <div className="field field--compact stock-dialog__add">
            <label className="field__label" id={`${addId}-label`} htmlFor={addId}>
              Add Form
            </label>
            <ComboboxSelect
              id={addId}
              label="Add Form"
              labelId={`${addId}-label`}
              value=""
              placeholder="Choose form"
              choices={addable.map((form) => ({ value: form.variantId, label: form.label }))}
              onChange={(variantId) => {
                if (!variantId) return;
                append({ jarId: null, variantId, removed: false, ...EMPTY_STOCK });
              }}
            />
          </div>
        )}
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

const StockDialog = (props: StockDialogProps): ReactElement => (
  <ModalButton
    tip="Edit Stock"
    label={<PencilIcon />}
    ariaLabel={`Edit Stock, ${props.ingredientName}`}
    className="icon-tip__edit icon-tip__edit--plain"
    eyebrow="Edit Stock"
    title={props.ingredientName}
  >
    {(close) => <StockDialogForm {...props} close={close} />}
  </ModalButton>
);

export default StockDialog;
export type { StockDialogProps, StockForm, StockJar } from './types';
