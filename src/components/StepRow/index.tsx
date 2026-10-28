import type { ReactElement } from 'react';
import FormIcon from '../FormIcon';
import './index.scss';
import type { StepRowProps } from './types';

// One step of a spell (M13.3): its position, its ingredient with the quantity
// and unit if it has them, and its text. Presentational: the spell builder
// hands it editing controls, the recipe page (MB.6) none, and a working's
// deduction lines (M13.8) draw theirs with it. See claude-docs/components/step-row.md.

/**
 * The quantity as the person typed it rather than as the column stores it: "1.000" is
 * "1" and "2.500" is "2.5", so only the decimals that carry information show (the owner,
 * 2026-10-28). A plain string edit, not a Number round trip, which would lose a quantity
 * past 15 digits.
 */
const plainQuantity = (quantity: string): string =>
  quantity.includes('.') ? quantity.replace(/0+$/, '').replace(/\.$/, '') : quantity;

/**
 * The amount and unit as one phrase, "2 tsp", or null where there is neither. A unit with no
 * quantity reads "— tsp", an en dash where the number would be: a missing amount, not an
 * amount of nothing, which "0 tsp" would claim (the owner, 2026-10-28).
 */
const amountOf = (quantity?: string | null, unit?: string | null): string | null => {
  if (!quantity && !unit) return null;
  return [quantity ? plainQuantity(quantity) : '—', unit].filter(Boolean).join(' ');
};

export default function StepRow({
  position,
  name,
  icon = null,
  quantity,
  unit,
  body,
  marks,
  note,
  handle,
  quantityField,
  unitField,
  bodyField,
  actions,
  rowRef,
  className,
  style,
}: StepRowProps): ReactElement {
  const amount = amountOf(quantity, unit);
  return (
    <li ref={rowRef} className={['step-row', className].filter(Boolean).join(' ')} style={style}>
      {handle}
      <span className="step-row__position">{position}.</span>
      {name !== null && (
        <p className="step-row__name">
          {/* The generic spoon for a one-off, which names no form group. */}
          <FormIcon name={icon} />
          {name}
        </p>
      )}
      {name !== null && marks}
      {name !== null && (quantityField || unitField) ? (
        <>
          {quantityField}
          {unitField}
        </>
      ) : (
        name !== null && amount && <p className="step-row__amount">{amount}</p>
      )}
      {bodyField ?? (body ? <p className="step-row__body">{body}</p> : null)}
      {actions}
      {name !== null && note && <div className="step-row__note">{note}</div>}
    </li>
  );
}
