import type { ReactElement } from 'react';
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
  badge,
  edit,
  aside,
  handle,
  formField,
  quantityField,
  unitField,
  bodyField,
  actions,
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
          {badge}
        </p>
      )}
    </>
  );
  if (textCard) {
    return (
      <li ref={rowRef} className={className_} style={style}>
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
      <li ref={rowRef} className={className_} style={style}>
        {identity}
        {!open && summary && <p className="step-row__summary">{summary}</p>}
        <div className="step-row__marks">{marks}</div>
        {edit}
        {actions}
        {/* Fields exist only while open; their values are the form's, so they persist. */}
        {open && (
          <div className="step-row__open" id={fieldsId}>
            <div className="step-row__inputs">
              {formField && <div className="step-row__form">{formField}</div>}
              {quantityField && <div className="step-row__quantity">{quantityField}</div>}
              {unitField && <div className="step-row__unit">{unitField}</div>}
              {bodyField && <div className="step-row__instruction">{bodyField}</div>}
            </div>
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
