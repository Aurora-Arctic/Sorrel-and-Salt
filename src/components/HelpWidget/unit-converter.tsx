'use client';

import { useId, useState, type ReactElement } from 'react';
import { UNITS, type Unit } from '@/modules/ingredients/schema/units';
import { unitConvert } from '@/modules/ingredients/validation/unit-convert';
import { ComboboxSelect } from '../Combobox';
import { unitLabel } from '../StockFields/units';
import { CONVERSION_REFUSALS } from './conversion-refusals';

// Every unit, with no None: a conversion needs both sides.
const UNIT_CHOICES = UNITS.map((unit) => ({ value: unit, label: unitLabel(unit) }));

// The help pages' converter: every answer is `unitConvert`'s, so it converts within a dimension and refuses
// every other pair exactly as the app does (claude-docs/components/help-pages.md, "Widgets").

function answer(amount: string, from: Unit, to: Unit): string {
  const value = Number(amount);
  if (amount.trim() === '' || !Number.isFinite(value) || value < 0)
    return 'Type an amount to convert.';
  const converted = unitConvert(value, from, to);
  if (!converted.ok) return CONVERSION_REFUSALS[converted.reason];
  return `${amount} ${unitLabel(from)} is ${converted.value} ${unitLabel(to)}.`;
}

const UnitConverter = (): ReactElement => {
  const id = useId();
  const [amount, setAmount] = useState('1');
  const [from, setFrom] = useState<Unit>('tbsp');
  const [to, setTo] = useState<Unit>('tsp');
  return (
    <figure className="figure help-widget">
      <div className="help-widget__fields">
        <div className="field">
          <label className="field__label" htmlFor={`${id}-amount`}>
            Amount
          </label>
          <input
            id={`${id}-amount`}
            className="input"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </div>
        <div className="field">
          <label className="field__label" id={`${id}-from-label`} htmlFor={`${id}-from`}>
            From
          </label>
          <ComboboxSelect
            id={`${id}-from`}
            label="From"
            labelId={`${id}-from-label`}
            value={from}
            onChange={(value) => setFrom(value as Unit)}
            choices={UNIT_CHOICES}
            fit
          />
        </div>
        <div className="field">
          <label className="field__label" id={`${id}-to-label`} htmlFor={`${id}-to`}>
            To
          </label>
          <ComboboxSelect
            id={`${id}-to`}
            label="To"
            labelId={`${id}-to-label`}
            value={to}
            onChange={(value) => setTo(value as Unit)}
            choices={UNIT_CHOICES}
            fit
          />
        </div>
      </div>
      <output className="help-widget__result" aria-label="Result" role="status">
        {answer(amount, from, to)}
      </output>
      <figcaption>
        The same conversion the app makes when it adds stock or plans a spell.
      </figcaption>
    </figure>
  );
};

export default UnitConverter;
