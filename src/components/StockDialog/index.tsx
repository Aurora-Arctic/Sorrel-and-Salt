'use client';

import { type ReactElement, useEffect, useId, useMemo, useRef, useState } from 'react';
import { FormProvider, useFieldArray, useForm, useFormContext, useWatch } from 'react-hook-form';
import { graphql } from '../../gql';
import { graphqlRequest } from '../../lib/graphql-client';
import { placeServerIssues } from '../../lib/graphql-failure';
import { usePendingNavigation } from '../../lib/navigation';
import { ComboboxSelect } from '../Combobox';
import { FieldError, FormActions } from '../Field';
import { BinButton, StockIcon } from '../IconTip';
import Modal, { DiscardQuestion, ModalButton, useDiscardGuard } from '../Modal';
import Notice from '../Notice';
import { StockBadge } from '../StockBadge';
import { amountText } from '../StockBadge/stock-words';
import StockFields, {
  EMPTY_STOCK,
  type StockFormValues,
  stockAmountsOf,
  stockFormValues,
} from '../StockFields';
import { changed, openingRows, rowFieldOf, stockBatch } from './batch';
import type {
  StockDialogFormProps,
  StockDialogProps,
  StockJarButtonProps,
  StockDialogValues,
  StockForm,
  StockRow,
} from './types';
import './index.scss';

// The stock button on a coven card (M9.9): a `ModalButton` opening a dialog
// with the coven's jars of the ingredient listed down one side and the chosen
// jar's fields beside them (option E, the owner's pick of 2026-10-20). A form
// is added from the list's foot, a jar's Remove waits for Save, and the whole
// dialog is sent as one `saveStock`. The service is the guard, the dialog says
// its refusal. Nothing on the page changes until the save has answered: the
// page reads again once the dialog has closed.
// claude-docs/components/stock-dialog.md.

const SaveStockDocument = graphql(`
  mutation SaveStock($workspaceId: ID!, $ingredientId: ID!, $input: SaveStockInput!) {
    saveStock(workspaceId: $workspaceId, ingredientId: $ingredientId, input: $input) {
      id
    }
  }
`);

interface PickProps {
  row: StockRow;
  label: string;
  chosen: boolean;
  edited: boolean;
  flagged: boolean;
  onChoose: () => void;
}

/**
 * One form in the list: a button choosing it, named by the form, its marks and
 * its amount, with the card's badge beside it. The badge is a button of its
 * own (its tip), so it sits next to the list's button rather than inside it.
 * The chosen form is `aria-current`: the list says which one the fields are
 * for, it is not a toggle that could be pressed off.
 */
function Pick({ row, label, chosen, edited, flagged, onChoose }: PickProps): ReactElement {
  const amounts = stockAmountsOf(row);
  return (
    <li className={row.removed ? 'stock-dialog__pick is-removed' : 'stock-dialog__pick'}>
      <button
        type="button"
        className="stock-dialog__choose"
        aria-current={chosen ? 'true' : undefined}
        onClick={onChoose}
      >
        <span className="stock-dialog__name">
          {row.removed ? <s>{label}</s> : label}
          {row.removed && <span className="visually-hidden">, Removed on Save</span>}
          {/* Commas heard and not seen, so the name reads "Flower, Edited, 250 g" rather
              than running its parts together. */}
          {edited && (
            <>
              <span className="spoken-separator">, </span>
              <span className="stock-dialog__edited">Edited</span>
            </>
          )}
          {flagged && (
            <>
              <span className="spoken-separator">, </span>
              {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a span with a name stands for a picture; an img would need a source */}
              <span className="stock-dialog__flag" role="img" aria-label="Needs a Fix">
                !
              </span>
            </>
          )}
          <span className="spoken-separator">, </span>
        </span>
        <span className="stock-dialog__amount">
          {amountText(amounts.quantityOnHand, amounts.unit)}
        </span>
      </button>
      {/* A jar on its way out is flagged by nothing but its strike. */}
      {!row.removed && (
        <StockBadge
          quantity={amounts.quantityOnHand}
          threshold={amounts.lowStockThreshold}
          unit={amounts.unit}
        />
      )}
    </li>
  );
}

interface JarProps {
  index: number;
  label: string;
  added: boolean;
  onRemove: () => void;
  onUndo: () => void;
}

/**
 * The chosen jar: its form as the heading, with Remove at the heading's end,
 * over its three fields at full size. Staged for removal, the fields are put
 * away, kept as typed, and Remove becomes Undo.
 */
function Jar({ index, label, added, onRemove, onUndo }: JarProps): ReactElement {
  const id = useId();
  const {
    control,
    formState: { errors },
  } = useFormContext<StockDialogValues>();
  const removed = useWatch({ control, name: `rows.${index}.removed` });
  const error = errors.rows?.[index]?.variantId?.message;
  return (
    // Named by the form alone, so "New" is not part of the group's name.
    <fieldset
      className="stock-dialog__jar"
      aria-labelledby={`${id}-name`}
      aria-describedby={error ? `${id}-error` : undefined}
    >
      <div className="stock-dialog__head">
        <h3 className="stock-dialog__heading">
          <span id={`${id}-name`}>{removed ? <s>{label}</s> : label}</span>
          {added && <span className="stock-dialog__new">New</span>}
        </h3>
        {removed ? (
          <button
            type="button"
            className="btn btn--small"
            aria-label={`Undo Remove ${label}`}
            onClick={onUndo}
          >
            Undo
          </button>
        ) : (
          <BinButton verb="Remove" name={label} onClick={onRemove} />
        )}
      </div>
      <FieldError id={`${id}-error`} message={error} />
      {removed ? (
        <p className="stock-dialog__removed">Removed when you save.</p>
      ) : (
        // Quantity and Unit on one row, Low Stock At beneath at Quantity's width.
        <div className="stock-dialog__fields">
          <StockFields<StockDialogValues> prefix={`rows.${index}`} form={label} />
        </div>
      )}
    </fieldset>
  );
}

/**
 * The fields' place before there is a form to fill: the chosen jar's layout,
 * its heading empty and its three fields shut, so the dialog keeps its shape
 * when the first form is added (the owner's call, 2026-10-20). The fields sit
 * in a throwaway form of their own, so nothing typed or registered here can
 * reach the dialog's values, its dirty check or its batch; there is no Remove.
 */
function NoJar(): ReactElement {
  const id = useId();
  const stand = useForm<StockFormValues>({ defaultValues: EMPTY_STOCK });
  return (
    <FormProvider {...stand}>
      <fieldset className="stock-dialog__jar" aria-describedby={`${id}-why`}>
        <legend className="visually-hidden">No Form Chosen</legend>
        <p id={`${id}-why`} className="visually-hidden">
          Add a form to enter its stock.
        </p>
        {/* "Form" in the placeholder ink where the form's name will go, so the fields stand where a
            jar's will and the eye is told what the space is for. Hidden from a screen reader: the
            legend above already names the state (the owner's call, 2026-10-21). */}
        <div className="stock-dialog__head is-blank" aria-hidden="true">
          <h3 className="stock-dialog__heading stock-dialog__placeholder">Form</h3>
        </div>
        <div className="stock-dialog__fields">
          <StockFields disabled />
        </div>
      </fieldset>
    </FormProvider>
  );
}

/** The forms held by no row yet, a staged removal still holding its own. */
const unheld = (forms: readonly StockForm[], rows: readonly StockRow[]): StockForm[] =>
  forms.filter((form) => !rows.some((row) => row.variantId === form.variantId));

/** The row a field path such as `rows.2.unit` names. */
const rowOf = (field: string): number => Number(field.split('.')[1]);

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
  openOn,
  close,
}: StockDialogFormProps): ReactElement => {
  const { refresh } = usePendingNavigation();
  const addId = useId();
  // Opened on a form the coven holds no jar of: it starts as a new row, as Add Form would add
  // it, but among the opening values, so the dialog opens unedited and Save waits for its
  // amounts (the owner, 2026-10-29). Not appended after mounting, which would mark it changed.
  const [opened] = useState(() => {
    const held = openingRows(jars, forms);
    const seed =
      openOn !== undefined &&
      forms.some((form) => form.variantId === openOn) &&
      !held.some((row) => row.variantId === openOn);
    return {
      rows: seed
        ? [...held, { jarId: null, variantId: openOn, removed: false, ...EMPTY_STOCK }]
        : held,
      seeded: seed ? openOn : null,
    };
  });
  const methods = useForm<StockDialogValues>({ defaultValues: { rows: opened.rows } });
  const {
    control,
    handleSubmit,
    setError,
    setFocus,
    getValues,
    setValue,
    formState: { errors, isDirty, isSubmitting },
  } = methods;
  const { fields, append, remove } = useFieldArray({ control, name: 'rows', keyName: 'key' });
  const rows = useWatch({ control, name: 'rows' }) ?? [];
  const discard = useDiscardGuard(isDirty);
  const sent = useRef(false);
  // The chosen form, by its variant: a row's index moves when an added row
  // before it goes. The first row, the first form from A to Z, is chosen as the dialog opens.
  const [chosenVariant, setChosenVariant] = useState<string | null>(
    openOn ?? getValues('rows')[0]?.variantId ?? null,
  );
  const [adding, setAdding] = useState('');
  // A form just added, whose Quantity takes the focus once its fields are drawn.
  const [focusAdded, setFocusAdded] = useState<string | null>(opened.seeded);
  const opening = useMemo(() => new Map(jars.map((jar) => [jar.id, stockFormValues(jar)])), [jars]);
  const labelOf = (variantId: string) =>
    forms.find((form) => form.variantId === variantId)?.label ?? '';
  const addable = unheld(forms, rows);
  // The chosen row, or the first when the chosen one has gone (an added form
  // removed before Save).
  const found = rows.findIndex((row) => row.variantId === chosenVariant);
  const chosen = found >= 0 ? found : rows.length > 0 ? 0 : -1;

  const focusIndex =
    focusAdded === null ? -1 : rows.findIndex((row) => row.variantId === focusAdded);
  useEffect(() => {
    if (focusIndex < 0) return;
    setFocus(`rows.${focusIndex}.quantityOnHand`);
    // oxlint-disable-next-line react/set-state-in-effect -- the state follows an outside value (a timer, a measurement or a focus request), so it can only be set from an effect
    setFocusAdded(null);
  }, [focusIndex, setFocus]);

  /** New, or a held jar whose amounts differ from when the dialog opened. */
  const edited = (row: StockRow): boolean => {
    if (row.removed) return false;
    if (row.jarId === null) return true;
    const was = opening.get(row.jarId);
    return was !== undefined && changed(row, was);
  };

  function add(): void {
    if (!adding) return;
    append(
      { jarId: null, variantId: adding, removed: false, ...EMPTY_STOCK },
      { shouldFocus: false },
    );
    setChosenVariant(adding);
    setFocusAdded(adding);
    setAdding('');
  }

  async function send({ rows: values }: StockDialogValues): Promise<void> {
    const { input, from } = stockBatch(values, jars);
    try {
      await graphqlRequest(SaveStockDocument, { workspaceId, ingredientId, input });
    } catch (error) {
      // Beside the amount, or on the jar, it names, every jar's at once; the
      // rest in the alert above the fields. What was typed and staged stays.
      // The first form with an error is chosen, so its error is in view.
      const marked: number[] = [];
      placeServerIssues(error, setError, ({ path }) => {
        const field = rowFieldOf(path, from);
        if (field) marked.push(rowOf(field));
        return field;
      });
      if (marked.length > 0) {
        const first = values[Math.min(...marked)];
        if (first) setChosenVariant(first.variantId);
      }
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
      {/* oxlint-disable-next-line react/refs -- the callback ref and handlers come from a hook and are only handed to the DOM, never read while rendering */}
      <form className="form" noValidate onSubmit={handleSubmit(send)}>
        <div className="stock-dialog">
          <div className="stock-dialog__columns">
            <div className="stock-dialog__list">
              {rows.length > 0 ? (
                <ul className="stock-dialog__picks">
                  {fields.map((field, index) => {
                    const row = rows[index];
                    if (!row) return null;
                    return (
                      <Pick
                        key={field.key}
                        row={row}
                        label={labelOf(row.variantId)}
                        chosen={index === chosen}
                        edited={edited(row)}
                        flagged={errors.rows?.[index] !== undefined}
                        onChoose={() => setChosenVariant(row.variantId)}
                      />
                    );
                  })}
                </ul>
              ) : (
                <p className="stock-dialog__empty">No stock yet. Add a form to start.</p>
              )}
              {/* Gone once every form has a jar: there is nothing left to add. */}
              {addable.length > 0 && (
                <div className="stock-dialog__add">
                  <div className="field field--compact">
                    <label className="field__label" id={`${addId}-label`} htmlFor={addId}>
                      Add Form
                    </label>
                    <ComboboxSelect
                      id={addId}
                      label="Add Form"
                      labelId={`${addId}-label`}
                      value={adding}
                      placeholder="Choose form"
                      choices={addable.map((form) => ({
                        value: form.variantId,
                        label: form.label,
                      }))}
                      onChange={setAdding}
                    />
                  </div>
                  <button type="button" className="btn btn--small" disabled={!adding} onClick={add}>
                    Add
                  </button>
                </div>
              )}
            </div>
            {/* With no form yet, the fields' place held by NoJar's shut ones. */}
            <div className="stock-dialog__detail">
              {errors.root?.message && <Notice kind="error">{errors.root.message}</Notice>}
              {chosen >= 0 && fields[chosen] && rows[chosen] && (
                <Jar
                  key={fields[chosen].key}
                  index={chosen}
                  label={labelOf(rows[chosen].variantId)}
                  added={rows[chosen].jarId === null}
                  // A jar held is staged, to be sent as a delete; a form added
                  // here was never sent, so it simply goes.
                  onRemove={() =>
                    rows[chosen]?.jarId === null
                      ? remove(chosen)
                      : setValue(`rows.${chosen}.removed`, true, { shouldDirty: true })
                  }
                  onUndo={() => setValue(`rows.${chosen}.removed`, false, { shouldDirty: true })}
                />
              )}
              {chosen < 0 && <NoJar />}
            </div>
          </div>
        </div>
        <FormActions
          noun="Stock"
          label="Save"
          busyLabel="Saving"
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
    label={<StockIcon />}
    ariaLabel={`Edit Stock, ${props.ingredientName}`}
    className="icon-tip__edit"
    eyebrow="Edit Stock"
    title={props.ingredientName}
    size="listed"
  >
    {(close) => <StockDialogForm {...props} close={close} />}
  </ModalButton>
);

/**
 * The same dialog opened by something other than its pencil: a menu item on a compendium card
 * (M9.12), whose owner holds the question of whether it is open. Modal restores nothing itself,
 * so `returnTo` names where the focus goes when it closes.
 */
export function StockDialogModal({
  onClose,
  returnTo,
  coven,
  ...props
}: StockDialogProps & {
  onClose: () => void;
  returnTo?: () => HTMLElement | null | undefined;
  /**
   * The coven the dialog writes to, put in the eyebrow: "Edit Stock for Whitethorn Coven" over the
   * ingredient's name, and so in the dialog's name ("Edit Stock for Whitethorn Coven, Testwort").
   * For a dialog opened from a page that is not a coven's, where nothing else says whose jars
   * these are (the owner's call, 2026-10-21); a coven's own pages leave it out, the address and
   * the shell already say, and the eyebrow stays "Edit Stock".
   */
  coven?: string;
}): ReactElement {
  return (
    <Modal
      eyebrow={coven ? `Edit Stock for ${coven}` : 'Edit Stock'}
      title={props.ingredientName}
      size="listed"
      onClose={onClose}
      returnTo={returnTo}
    >
      {(close) => <StockDialogForm {...props} close={close} />}
    </Modal>
  );
}

/**
 * The same dialog behind a button of the caller's own, opening on one form
 * (`openOn`): a jar on the entry page's shelf. One dialog, two doors, so what
 * is saved and how it is refused cannot differ between them.
 */
export const StockJarButton = ({
  ariaLabel,
  className,
  children,
  ...props
}: StockJarButtonProps): ReactElement => (
  <ModalButton
    label={children}
    ariaLabel={ariaLabel}
    className={className ?? ''}
    eyebrow="Edit Stock"
    title={props.ingredientName}
    size="listed"
  >
    {(close) => <StockDialogForm {...props} close={close} />}
  </ModalButton>
);

export default StockDialog;
export type { StockData, StockDialogProps, StockForm, StockJar } from './types';
