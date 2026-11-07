'use client';

import { useId, useState, type ReactElement } from 'react';
import { UNITS, type Unit } from '@/modules/ingredients/schema/units';
import { unitConvert } from '@/modules/ingredients/validation/unit-convert';
import { unitLabel } from '../StockFields/units';
import { CONVERSION_REFUSALS } from './conversion-refusals';

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
  const options = UNITS.map((unit) => (
    <option key={unit} value={unit}>
      {unitLabel(unit)}
    </option>
  ));
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
          <label className="field__label" htmlFor={`${id}-from`}>
            From
          </label>
          <select
            id={`${id}-from`}
            className="input"
            value={from}
            onChange={(event) => setFrom(event.target.value as Unit)}
          >
            {options}
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor={`${id}-to`}>
            To
          </label>
          <select
            id={`${id}-to`}
            className="input"
            value={to}
            onChange={(event) => setTo(event.target.value as Unit)}
          >
            {options}
          </select>
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
