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
    </li>
  );
}
