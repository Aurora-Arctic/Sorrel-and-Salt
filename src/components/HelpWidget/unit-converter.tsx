'use client';

import { useId, useState, type ReactElement } from 'react';
import { UNITS, type Unit } from '@/modules/ingredients/schema/units';
import { formatQuantity, parseQuantity } from '@/lib/formats';
import { QUANTITY_HINT, quantityProblem } from '@/lib/quantity-rule';
import { unitConvert } from '@/modules/ingredients/validation/unit-convert';
import { ComboboxSelect } from '../Combobox';
import { PlainTextField } from '../Field';
import { unitLabel } from '../StockFields/units';
import { CONVERSION_REFUSALS } from './conversion-refusals';

// Every unit, with no None: a conversion needs both sides.
const UNIT_CHOICES = UNITS.map((unit) => ({ value: unit, label: unitLabel(unit) }));

// The help pages' converter: every answer is `unitConvert`'s, so it converts within a dimension and refuses
// every other pair exactly as the app does (claude-docs/components/help-pages.md, "Widgets").

const AMOUNT_LABEL = 'Amount';

const checkAmount = (text: string) => quantityProblem(text, AMOUNT_LABEL);

type Answer =
  | { kind: 'asked' }
  | { kind: 'unusable' }
  | { kind: 'refused'; sentence: string }
  | { kind: 'converted'; value: number };

function answer(amount: string, from: Unit, to: Unit): Answer {
  const value = parseQuantity(amount);
  if (value === null) return { kind: 'asked' };
  if (checkAmount(amount)) return { kind: 'unusable' };
  const converted = unitConvert(value, from, to);
  return converted.ok
    ? { kind: 'converted', value: converted.value }
    : { kind: 'refused', sentence: CONVERSION_REFUSALS[converted.reason] };
}

const Dash = (): ReactElement => <span className="help-widget__none">—</span>;

/**
 * The answer as an equation, "1 tbsp = 3 tsp", which a screen reader skips for the sentence, "1 tbsp is 3 tsp.": a
 * read "equals" would make the figure harder to hear, not easier. The left side and the sign hold together, so a narrow
 * figure wraps after the sign.
 */
const Result = ({ amount, from, to }: { amount: string; from: Unit; to: Unit }): ReactElement => {
  const result = answer(amount, from, to);
  const shown = String(parseQuantity(amount));
  const usable = result.kind === 'refused' || result.kind === 'converted';
  const sentence =
    result.kind === 'asked'
      ? 'Type an amount to convert.'
      : result.kind === 'unusable'
        ? 'Correct the amount to convert it.'
        : result.kind === 'refused'
          ? result.sentence
          : `${shown} ${unitLabel(from)} is ${result.value} ${unitLabel(to)}.`;
  return (
    <output className="help-widget__result" aria-label="Result" role="status">
      <span className="visually-hidden">{sentence}</span>
      <span className="help-widget__equation" aria-hidden="true">
        <span className="help-widget__side">
          {usable ? shown : <Dash />} {unitLabel(from)}{' '}
          <span className="help-widget__equals">=</span>
        </span>{' '}
        <span className="help-widget__side">
          {result.kind === 'converted' ? `${result.value} ${unitLabel(to)}` : <Dash />}
        </span>
      </span>
      {result.kind === 'refused' && (
        <span className="help-widget__refusal" aria-hidden="true">
          <strong>Cannot convert</strong> {result.sentence}
        </span>
      )}
    </output>
  );
};

const UnitConverter = (): ReactElement => {
  const id = useId();
  const [amount, setAmount] = useState('1');
  const [from, setFrom] = useState<Unit>('tbsp');
  const [to, setTo] = useState<Unit>('tsp');
  return (
    <figure className="figure help-widget">
      <div className="help-widget__fields">
        <PlainTextField
          label={AMOUNT_LABEL}
          inputMode="decimal"
          format={formatQuantity}
          check={checkAmount}
          hint={QUANTITY_HINT}
          value={amount}
          onChange={setAmount}
        />
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
      <Result amount={amount} from={from} to={to} />
      <figcaption>
        The same conversion the app makes when it adds stock or plans a spell.
      </figcaption>
    </figure>
  );
};

export default UnitConverter;
