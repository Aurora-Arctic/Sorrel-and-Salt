import type { MouseEvent, ReactElement } from 'react';
import FormIcon from '../FormIcon';
import './index.scss';
import type { StepRowProps } from './types';

// One step of a spell (M13.3): its position, its ingredient with the quantity
// and unit if it has them, and its text. Presentational: the spell builder
// hands it editing controls, the recipe page (MB.6) none, and a working's
// deduction lines (M13.8) draw theirs with it. See claude-docs/components/step-row.md.

/** The amount and unit as one phrase, "2 tsp", or null where there is neither. */
const amountOf = (quantity?: string | null, unit?: string | null): string | null =>
  [quantity, unit].filter(Boolean).join(' ') || null;

/**
 * A click on the card's plain face toggles it, as a mouse shortcut for the pencil (which stays the
 * keyboard and screen-reader control, so the row gets no role or tab stop). Clicks on a control, or
 * anywhere in the open fields, are left to themselves; an open card closes only from its header text.
 */
function toggleFromFace(event: MouseEvent<HTMLLIElement>, open: boolean, toggle: () => void): void {
  const target = event.target as Element;
  // React bubbles a portal's clicks (a Unit listbox) to the row though the DOM does not: not the face.
  if (!event.currentTarget.contains(target)) return;
  // A target a click just removed (a picked list row) is no longer anywhere in the card.
  if (!target.isConnected) return;
  if (target.closest('button, input, textarea, select, a, [role=combobox], .step-row__open'))
    return;
  // Open, only the header's own text closes it: nothing near the fields ever does.
  if (open && !target.closest('.step-row__name, .step-row__summary, .step-row__position')) return;
  toggle();
}

export default function StepRow({
  position,
  name,
  icon = null,
  quantity,
  unit,
  body,
  marks,
  note,
  open,
  fieldsId,
  summary,
  bodySummary,
  badge,
  edit,
  onToggle,
  aside,
  handle,
  nameField,
  formField,
  quantityField,
  unitField,
  bodyField,
  actions,
  errorRef,
  rowRef,
  className,
  style,
}: StepRowProps): ReactElement {
  const amount = amountOf(quantity, unit);
  const collapsible = open !== undefined && name !== null;
  // An instruction-only step opens and closes too, but is one line of text, not a card of fields.
  const textCard = open !== undefined && name === null;
  const className_ = [
    'step-row',
    collapsible && (open ? 'step-row--open' : 'step-row--closed'),
    textCard && !open && 'step-row--folded',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const identity = (
    <>
      {handle && <div className="step-row__handle">{handle}</div>}
      <span className="step-row__position">{position}.</span>
      {name !== null && (
        <p className="step-row__name">
          {/* The generic spoon for a one-off, which names no form group. */}
          <FormIcon name={icon} />
          {name}
          {/* A card's badge stands with the marks at the right; the bare line keeps it here. */}
          {!collapsible && badge}
        </p>
      )}
    </>
  );
  if (textCard) {
    return (
      <li
        ref={rowRef}
        className={className_}
        style={style}
        onClick={onToggle && ((event) => toggleFromFace(event, open, onToggle))}
      >
        {identity}
        {open ? (
          <div className="step-row__field" id={fieldsId}>
            {bodyField}
          </div>
        ) : (
          <p className="step-row__text">{summary}</p>
        )}
        {edit}
        {actions}
      </li>
    );
  }
  if (collapsible) {
    return (
      <li
        ref={rowRef}
        className={className_}
        style={style}
        onClick={onToggle && ((event) => toggleFromFace(event, open, onToggle))}
      >
        {identity}
        {!open && summary && <p className="step-row__summary">{summary}</p>}
        {!open && bodySummary && (
          <p className="step-row__summary step-row__body-summary">{bodySummary}</p>
        )}
        <div className="step-row__marks">
          {badge}
          {marks}
        </div>
        {edit}
        {actions}
        {/* Fields exist only while open; their values are the form's, so they persist. */}
        {open && (
          <div className="step-row__open" id={fieldsId}>
            <div className="step-row__inputs">
              {nameField && <div className="step-row__name-field">{nameField}</div>}
              {formField && <div className="step-row__form">{formField}</div>}
              {quantityField && <div className="step-row__quantity">{quantityField}</div>}
              {unitField && <div className="step-row__unit">{unitField}</div>}
              {bodyField && <div className="step-row__instruction">{bodyField}</div>}
            </div>
            <div className="step-row__inputs-error" ref={errorRef} />
            {note && <div className="step-row__note">{note}</div>}
            {aside && <p className="step-row__aside">{aside}</p>}
          </div>
        )}
      </li>
    );
  }
  return (
    <li ref={rowRef} className={className_} style={style}>
      {identity}
      {name !== null && <div className="step-row__marks">{marks}</div>}
      {name !== null && (quantityField || unitField) ? (
        <div className="step-row__fields">
          {quantityField}
          {unitField}
        </div>
      ) : (
        name !== null && amount && <p className="step-row__amount">{amount}</p>
      )}
      {bodyField ? (
        <div className="step-row__field">{bodyField}</div>
      ) : body ? (
        <p className="step-row__body">{body}</p>
      ) : null}
      {actions}
      {name !== null && note && <div className="step-row__note">{note}</div>}
    </li>
  );
}
